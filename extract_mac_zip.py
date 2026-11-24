"""Extrae un ZIP de macOS en Windows resolviendo los symlinks como copias reales."""

import os
import shutil
import stat
import sys
import zipfile


def extract(zip_path: str, dest: str) -> None:
    symlinks = []
    with zipfile.ZipFile(zip_path) as archive:
        for info in archive.infolist():
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode):
                target = archive.read(info).decode("utf-8", "replace").strip()
                symlinks.append((info.filename, target))
                continue
            path = os.path.join(dest, info.filename.replace("/", os.sep))
            if info.is_dir():
                os.makedirs(path, exist_ok=True)
                continue
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with archive.open(info) as src, open(path, "wb") as out:
                shutil.copyfileobj(src, out)

    pending = symlinks
    for _ in range(4):
        still = []
        for name, target in pending:
            link = os.path.join(dest, name.replace("/", os.sep))
            base = os.path.dirname(link)
            resolved = os.path.normpath(os.path.join(base, target.replace("/", os.sep)))
            os.makedirs(base, exist_ok=True)
            if os.path.isdir(resolved):
                if os.path.isdir(link):
                    # Ya se creó como carpeta porque el ZIP contenía archivos dentro de ella.
                    shutil.copytree(resolved, link, dirs_exist_ok=True)
                else:
                    if os.path.isfile(link):
                        os.remove(link)
                    shutil.copytree(resolved, link, dirs_exist_ok=True)
            elif os.path.isfile(resolved):
                if os.path.isdir(link):
                    shutil.rmtree(link)
                shutil.copy2(resolved, link)
            else:
                still.append((name, target))
        if not still:
            break
        pending = still

    for name, target in pending:
        link = os.path.join(dest, name.replace("/", os.sep))
        os.makedirs(os.path.dirname(link), exist_ok=True)
        if os.path.isdir(link):
            continue
        with open(link, "w", encoding="utf-8") as out:
            out.write(target)


if __name__ == "__main__":
    extract(sys.argv[1], sys.argv[2])
