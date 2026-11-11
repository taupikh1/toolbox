#!/usr/bin/env python3
"""
Ubah model UVR MDX-Net (sumbu waktu terkunci 256 frame) jadi sumbu waktu bebas ("dynt").
Bobot TIDAK diubah. Hanya dimensi waktu input/output dibuat dinamis.

Pakai (di GitHub Codespaces / PC):
  pip install onnx onnxruntime numpy huggingface_hub
  python convert_mdx_dynt.py                       # unduh Voc_FT, konversi, tes, cetak SHA256
  python convert_mdx_dynt.py --repo USER/NAMA_REPO # + unggah ke HuggingFace (butuh env HF_TOKEN)

Opsi lain:
  --src file.onnx   pakai file lokal (lewati unduh)
  --url URL         sumber lain (mis. Kim_Vocal_2)
  --out nama.onnx   nama file hasil

Skrip ini BELUM pernah dijalankan oleh pembuatnya. Tes bawaan di akhir yang menentukan
berhasil atau tidak: kalau ada baris GAGAL, jangan dipakai.
"""
import argparse
import hashlib
import os
import sys
import urllib.request

import numpy as np

DEFAULT_URL = (
    "https://github.com/TRvlvr/model_repo/releases/download/"
    "all_public_uvr_models/UVR-MDX-NET-Voc_FT.onnx"
)
TIME_FROM = 256  # dim_t = 8 -> 2^8 frame, nilai yang terkunci di model asli


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for blk in iter(lambda: f.read(1 << 20), b""):
            h.update(blk)
    return h.hexdigest()


def download(url, dst):
    print(f"Mengunduh {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r, open(dst, "wb") as f:
        total = int(r.headers.get("Content-Length") or 0)
        got = 0
        while True:
            blk = r.read(1 << 20)
            if not blk:
                break
            f.write(blk)
            got += len(blk)
            if total:
                print(f"\r  {got / 1e6:.1f} / {total / 1e6:.1f} MB", end="")
    print()


def make_time_dynamic(onnx, model):
    """Dimensi terakhir (waktu) input & output -> simbolik 'T'. Kembalikan jumlah yang diubah."""
    changed = 0
    for vi in list(model.graph.input) + list(model.graph.output):
        dims = vi.type.tensor_type.shape.dim
        if len(dims) != 4:
            print(f"  lewati {vi.name}: bukan 4 dimensi")
            continue
        d = dims[3]
        if d.HasField("dim_value") and d.dim_value == TIME_FROM:
            d.ClearField("dim_value")
            d.dim_param = "T"
            changed += 1
            print(f"  {vi.name}: sumbu waktu {TIME_FROM} -> dinamis")
        else:
            print(f"  PERINGATAN {vi.name}: dim waktu bukan {TIME_FROM} (nilai: {d.dim_value or d.dim_param})")
    # Bentuk perantara yang mengunci 256 dibuang, ORT menghitung ulang sendiri.
    del model.graph.value_info[:]
    return changed


def fix_hardcoded_shapes(onnx, numpy_helper, model):
    """Cari konstanta bentuk (int64) yang memuat 256. Reshape dengan dim terakhir 256 diganti -1."""
    users = {}
    for n in model.graph.node:
        for i in n.input:
            users.setdefault(i, []).append(n)
    fixed = 0
    for init in model.graph.initializer:
        if init.data_type != onnx.TensorProto.INT64:
            continue
        arr = numpy_helper.to_array(init)
        if arr.size == 0 or arr.size > 8 or TIME_FROM not in arr:
            continue
        ops = sorted({n.op_type for n in users.get(init.name, [])})
        print(f"  konstanta {init.name} = {arr.tolist()} dipakai oleh {ops}")
        if ops == ["Reshape"] and arr[-1] == TIME_FROM and not (arr == -1).any():
            arr2 = arr.copy()
            arr2[-1] = -1
            init.CopyFrom(numpy_helper.from_array(arr2.astype(np.int64), init.name))
            fixed += 1
            print(f"    -> diganti jadi {arr2.tolist()}")
    return fixed


def run_once(ort, path, T, seed=0):
    sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    name = sess.get_inputs()[0].name
    out_name = sess.get_outputs()[0].name
    shape0 = sess.get_inputs()[0].shape
    F = shape0[2] if isinstance(shape0[2], int) else 3072
    x = np.random.RandomState(seed).randn(1, 4, F, T).astype(np.float32) * 0.1
    y = sess.run([out_name], {name: x})[0]
    return x, y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--src")
    ap.add_argument("--out", default="voc-ft-dynt.onnx")
    ap.add_argument("--repo")
    args = ap.parse_args()

    import onnx
    from onnx import numpy_helper
    import onnxruntime as ort

    src = args.src
    if not src:
        src = "source.onnx"
        if not os.path.exists(src):
            download(args.url, src)
    print(f"Sumber: {src}  {os.path.getsize(src) / 1e6:.1f} MB  sha256={sha256_file(src)}")

    model = onnx.load(src)
    print("Mengubah sumbu waktu...")
    n = make_time_dynamic(onnx, model)
    if n == 0:
        print("GAGAL: tidak ada dimensi yang bisa diubah (bentuk model tidak seperti dugaan).")
        sys.exit(1)
    print("Memeriksa konstanta bentuk...")
    fixed = fix_hardcoded_shapes(onnx, numpy_helper, model)
    print(f"  Reshape yang diperbaiki otomatis: {fixed}")
    onnx.save(model, args.out)
    print(f"Tersimpan: {args.out}")

    print("Tes 1: hasil harus sama dengan model asli pada 256 frame")
    ok = True
    try:
        x0, y0 = run_once(ort, src, TIME_FROM)
        x1, y1 = run_once(ort, args.out, TIME_FROM)
        diff = float(np.max(np.abs(y0 - y1)))
        scale = float(np.max(np.abs(y0))) + 1e-9
        rel = diff / scale
        print(f"  selisih maks {diff:.3e}  relatif {rel:.3e}")
        if rel > 1e-3:
            print("  GAGAL: hasil berbeda dari model asli")
            ok = False
        else:
            print("  OK")
    except Exception as e:  # noqa: BLE001
        print(f"  GAGAL: {e}")
        ok = False

    print("Tes 2: panjang waktu lain harus jalan dan bentuk keluaran = masukan")
    for T in (32, 64, 128):
        try:
            x, y = run_once(ort, args.out, T)
            same = tuple(x.shape) == tuple(y.shape)
            print(f"  T={T}: keluaran {tuple(y.shape)} {'OK' if same else 'GAGAL (bentuk beda)'}")
            ok = ok and same
        except Exception as e:  # noqa: BLE001
            print(f"  T={T}: GAGAL: {e}")
            ok = False

    size = os.path.getsize(args.out)
    sha = sha256_file(args.out)
    print()
    print("=" * 60)
    print(f"file   : {args.out}")
    print(f"ukuran : {size} byte")
    print(f"sha256 : {sha}")
    print(f"status : {'LULUS semua tes' if ok else 'ADA TES GAGAL, jangan dipakai'}")
    print("=" * 60)

    if args.repo:
        if not ok:
            print("Unggah dibatalkan karena ada tes gagal.")
            sys.exit(2)
        token = os.environ.get("HF_TOKEN")
        if not token:
            print("Set dulu: export HF_TOKEN=...  (token jenis write)")
            sys.exit(3)
        from huggingface_hub import HfApi

        api = HfApi(token=token)
        api.create_repo(args.repo, exist_ok=True)
        api.upload_file(
            path_or_fileobj=args.out,
            path_in_repo=os.path.basename(args.out),
            repo_id=args.repo,
        )
        print(f"URL: https://huggingface.co/{args.repo}/resolve/main/{os.path.basename(args.out)}")
    sys.exit(0 if ok else 2)


if __name__ == "__main__":
    main()
