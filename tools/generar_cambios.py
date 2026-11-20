"""Genera el historial de cambios de las APIs del proyecto a partir de los commits de git.

Para cada commit que toca specs/*.json compara los endpoints (método + ruta) con el
estado anterior y anota cuáles se agregaron, cambiaron o se quitaron. Agrupa por fecha.

Salida:
  specs/cambios.json  -> lo usa la vista #cambios del sitio
  cambios.html        -> versión estática (sin JavaScript): fecha -> endpoints

Uso (desde la carpeta del repo, después de hacer commit de tus cambios):
  py tools/generar_cambios.py
"""
import html, json, pathlib, subprocess

RAIZ = pathlib.Path(__file__).resolve().parent.parent
METODOS = ["get", "post", "put", "patch", "delete"]
IGNORAR = {"specs/catalogo.json", "specs/cambios.json"}


def git(*args):
    return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True,
                          encoding="utf-8", check=True).stdout


def endpoints_en(commit):
    """{(api_id, METODO, ruta): {"api": nombre, "resumen": ...}} de todas las specs en ese commit."""
    out = {}
    archivos = git("ls-tree", "-r", "--name-only", commit, "specs").split()
    for ruta_archivo in archivos:
        if not ruta_archivo.endswith(".json") or ruta_archivo in IGNORAR:
            continue
        try:
            spec = json.loads(git("show", f"{commit}:{ruta_archivo}"))
        except (json.JSONDecodeError, subprocess.CalledProcessError):
            continue
        if "paths" not in spec:
            continue
        api_id = pathlib.Path(ruta_archivo).stem
        nombre = spec.get("info", {}).get("title", api_id)
        for ruta, item in spec["paths"].items():
            for m in METODOS:
                if m in item:
                    op = item[m]
                    out[(api_id, m.upper(), ruta)] = {
                        "api": nombre,
                        "resumen": op.get("summary", ""),
                        "firma": json.dumps(op, sort_keys=True, ensure_ascii=False),
                    }
    return out


def main():
    commits = git("log", "--reverse", "--format=%H|%ad|%s", "--date=format:%Y-%m-%d", "--", "specs").splitlines()
    previo, por_fecha = {}, {}
    for linea in commits:
        sha, fecha, mensaje = linea.split("|", 2)
        actual = endpoints_en(sha)
        cambios = []
        for k in [k for k in actual if k not in previo]:
            cambios.append((k, actual[k], "nuevo"))
        for k in [k for k in actual if k in previo]:
            if actual[k]["firma"] != previo[k]["firma"]:
                cambios.append((k, actual[k], "modificado"))
        for k in [k for k in previo if k not in actual]:
            cambios.append((k, previo[k], "eliminado"))
        previo = actual
        if not cambios:
            continue
        v = por_fecha.setdefault(fecha, {"fecha": fecha, "commits": [], "apis": {}})
        v["commits"].append({"sha": sha[:7], "mensaje": mensaje})
        for (api_id, metodo, ruta), info, estado in cambios:
            g = v["apis"].setdefault(api_id, {"id": api_id, "api": info["api"], "endpoints": []})
            g["endpoints"].append({"metodo": metodo, "ruta": ruta, "resumen": info["resumen"], "estado": estado})

    versiones = []
    for fecha in sorted(por_fecha, reverse=True):
        v = por_fecha[fecha]
        v["apis"] = list(v["apis"].values())
        versiones.append(v)

    (RAIZ / "specs" / "cambios.json").write_text(
        json.dumps({"versiones": versiones}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    escribir_html(versiones)
    total = sum(len(g["endpoints"]) for v in versiones for g in v["apis"])
    print(f"{len(versiones)} fechas, {total} cambios de endpoints")


def escribir_html(versiones):
    e = html.escape
    secciones = []
    for v in versiones:
        n = sum(len(g["endpoints"]) for g in v["apis"])
        items = []
        for g in v["apis"]:
            for ep in g["endpoints"]:
                items.append(
                    f'        <li><span class="metodo">{e(ep["metodo"])}</span> '
                    f'<code class="endpoint">{e(ep["ruta"])}</code> '
                    f'<span class="api">{e(g["api"])}</span> '
                    f'<span class="estado">{e(ep["estado"])}</span>'
                    + (f' <span class="resumen">— {e(ep["resumen"])}</span>' if ep["resumen"] else "")
                    + "</li>")
        secciones.append(f'''    <section class="fecha" id="{e(v["fecha"])}">
      <h2><time datetime="{e(v["fecha"])}">{e(v["fecha"])}</time> <small>({n} endpoints)</small></h2>
      <ul>
{chr(10).join(items)}
      </ul>
    </section>''')
    total = sum(len(g["endpoints"]) for v in versiones for g in v["apis"])
    pagina = f'''<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Historial de cambios · fechas y endpoints</title>
  <style>
    body {{ font: 16px/1.6 system-ui, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; background: #f6f7f9; color: #1c2230; }}
    main {{ max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }}
    a {{ color: #2457d6; }}
    h1 {{ margin: 8px 0 4px; }}
    .resumen-total {{ color: #5b6475; margin: 0 0 24px; }}
    .fecha {{ background: #fff; border: 1px solid #e1e5ec; border-radius: 12px; padding: 12px 18px; margin-bottom: 12px; }}
    .fecha h2 {{ margin: 0 0 6px; font: 700 1.1rem ui-monospace, Consolas, monospace; }}
    .fecha h2 small {{ font: 400 .85rem system-ui, sans-serif; color: #5b6475; }}
    ul {{ margin: 0; padding-left: 20px; }}
    .metodo {{ font: 700 .78rem ui-monospace, Consolas, monospace; }}
    .endpoint {{ font-weight: 600; overflow-wrap: anywhere; }}
    .api, .estado, .resumen {{ font-size: .82rem; color: #5b6475; }}
    .estado {{ background: #eef1f5; border-radius: 999px; padding: 0 8px; }}
  </style>
</head>
<body>
  <main>
    <p><a href="./#inicio">← Volver al inicio</a></p>
    <h1>Historial de cambios: fechas y endpoints</h1>
    <p class="resumen-total">{len(versiones)} fechas · {total} endpoints · de la más reciente a la más antigua</p>
{chr(10).join(secciones)}
  </main>
</body>
</html>
'''
    (RAIZ / "cambios.html").write_text(pagina, encoding="utf-8")


if __name__ == "__main__":
    main()
