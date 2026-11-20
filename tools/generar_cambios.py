"""Genera cambios.html (HTML estático: fecha -> endpoints) desde specs/square-changelog.json.
Uso: py tools/generar_cambios.py
"""
import json, html, pathlib

raiz = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((raiz / "specs" / "square-changelog.json").read_text(encoding="utf-8"))
versiones = sorted(data["versiones"], key=lambda v: v["fecha"], reverse=True)
e = html.escape

filas = []
for v in versiones:
    eps = [(g["api"], x["nombre"], x["estado"]) for g in v["endpoints"] for x in g["endpoints"]]
    items = "\n".join(
        f'        <li><code class="endpoint">{e(n)}</code> <span class="api">{e(a)}</span> <span class="estado">{e(s)}</span></li>'
        for a, n, s in eps
    ) or '        <li class="vacio">Sin endpoints en esta versión</li>'
    filas.append(f'''    <section class="fecha" id="{e(v["fecha"])}">
      <h2><time datetime="{e(v["fecha"])}">{e(v["fecha"])}</time> <small>({len(eps)} endpoints)</small></h2>
      <ul>
{items}
      </ul>
    </section>''')

total = sum(len(g["endpoints"]) for v in versiones for g in v["endpoints"])
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
    .resumen {{ color: #5b6475; margin: 0 0 24px; }}
    .fecha {{ background: #fff; border: 1px solid #e1e5ec; border-radius: 12px; padding: 12px 18px; margin-bottom: 12px; }}
    .fecha h2 {{ margin: 0 0 6px; font: 700 1.1rem ui-monospace, Consolas, monospace; }}
    .fecha h2 small {{ font: 400 .85rem system-ui, sans-serif; color: #5b6475; }}
    ul {{ margin: 0; padding-left: 20px; }}
    .endpoint {{ font-weight: 600; overflow-wrap: anywhere; }}
    .api, .estado {{ font-size: .8rem; color: #5b6475; }}
    .estado {{ background: #eef1f5; border-radius: 999px; padding: 0 8px; }}
    .vacio {{ color: #5b6475; list-style: none; margin-left: -20px; }}
  </style>
</head>
<body>
  <main>
    <p><a href="./#inicio">← Volver al inicio</a></p>
    <h1>Historial de cambios: fechas y endpoints</h1>
    <p class="resumen">{len(versiones)} fechas · {total} endpoints · ordenado de la más reciente a la más antigua</p>
{chr(10).join(filas)}
  </main>
</body>
</html>
'''
(raiz / "cambios.html").write_text(pagina, encoding="utf-8")
print(f"cambios.html: {len(versiones)} fechas, {total} endpoints")
