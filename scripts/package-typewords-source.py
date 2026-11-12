"""Publish deterministic GPL corresponding source alongside the static build."""
from pathlib import Path
import os
import zipfile

root = Path(__file__).resolve().parent.parent
source = root / 'vendor/typewords'
target = root / 'public/apps/typewords'
ignored = {'.git', 'node_modules', '.nuxt', '.output', '.data', '.cache', '.vercel', '.DS_Store', 'dist', 'dist-ssr'}
assert source.is_dir() and target.is_dir()
files = []
for directory, directories, names in os.walk(source):
    directories[:] = sorted(name for name in directories if name not in ignored and not name.startswith('.env') and not (Path(directory) / name).is_symlink())
    for name in sorted(names):
        file = Path(directory) / name
        if file.is_symlink() or (name.startswith('.env') and name != '.env.example') or file.suffix in {'.log', '.zip', '.tsbuildinfo'}:
            continue
        files.append(file)
assert all(source / name in files for name in ['LICENSE', 'pnpm-lock.yaml', 'EVONCHAT.md'])
with zipfile.ZipFile(target / 'typewords-source.zip', 'w') as output:
    for file in files:
        info = zipfile.ZipInfo('TypeWords/' + file.relative_to(source).as_posix(), date_time=(2026, 11, 12, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        output.writestr(info, file.read_bytes(), compresslevel=9)
(target / 'LICENSE.txt').write_bytes((source / 'LICENSE').read_bytes())
print(f'Packaged {len(files)} corresponding source files')
