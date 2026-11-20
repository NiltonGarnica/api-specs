"""Historial de cambios de las APIs: fecha -> endpoints.

specs/cambios.json es la fuente (puedes editarlo a mano: agrega una fecha con sus endpoints).
Este script genera cambios.html (versión estática, sin JavaScript) a partir de ese JSON.

  py tools/generar_cambios.py          -> regenera cambios.html desde specs/cambios.json
  py tools/generar_cambios.py --demo   -> vuelve a crear fechas de demostración al azar
                                          (2 endpoints por fecha) y regenera cambios.html
"""
import html, json, pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
METODOS = ["get", "post", "put", "patch", "delete"]


def crear_demo(semilla=2026):
    """Reparte los endpoints actuales de las specs en fechas al azar, 2 endpoints por fecha.
    Respeta el orden: Facturas y Clientes primero, y dentro de cada API el orden de la spec."""
    import datetime, random
    rnd = random.Random(semilla)
    catalogo = json.loads((RAIZ / "specs" / "catalogo.json").read_text(encoding="utf-8"))["apis"]
    colas = []
    for api in catalogo:
        spec = json.loads((RAIZ / "specs" / f"{api['id']}.json").read_text(encoding="utf-8"))
        nombre = spec.get("info", {}).get("title", api["nombre"])
        eps = [{"metodo": m.upper(), "ruta": r, "resumen": item[m].get("summary", ""), "estado": "nuevo"}
               for r, item in spec["paths"].items() for m in METODOS if m in item]
        pares = [eps[i:i + 2] for i in range(0, len(eps), 2)]
        colas.append({"id": api["id"], "api": nombre, "pares": pares})

    # Las dos primeras APIs del catálogo salen primero; el resto se intercala al azar.
    orden = [(colas[0], p) for p in colas[0]["pares"]] + [(colas[1], p) for p in colas[1]["pares"]]
    resto = [c for c in colas[2:] for _ in c["pares"]]
    rnd.shuffle(resto)
    usados = {c["id"]: 0 for c in colas}
    for c in resto:
        orden.append((c, c["pares"][usados[c["id"]]]))
        usados[c["id"]] += 1

    inicio, fin = datetime.date(2025, 1, 6), datetime.date(2026, 11, 11)
    dias = sorted(rnd.sample(range((fin - inicio).days + 1), len(orden)))
    versiones = []
    for dia, (c, par) in zip(dias, orden):
        fecha = (inicio + datetime.timedelta(days=dia)).isoformat()
        versiones.append({"fecha": fecha, "apis": [{"id": c["id"], "api": c["api"], "endpoints": par}]})
    versiones.sort(key=lambda v: v["fecha"], reverse=True)
    return versiones


def main():
    ruta_json = RAIZ / "specs" / "cambios.json"
    if "--demo" in sys.argv or not ruta_json.exists():
        versiones = crear_demo()
        ruta_json.write_text(json.dumps({"demostracion": True, "versiones": versiones},
                                        ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    else:
        versiones = json.loads(ruta_json.read_text(encoding="utf-8"))["versiones"]
        versiones.sort(key=lambda v: v["fecha"], reverse=True)
    escribir_html(versiones)
    total = sum(len(g["endpoints"]) for v in versiones for g in v["apis"])
    print(f"{len(versiones)} fechas, {total} endpoints")


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
    <p class="resumen-total">{len(versiones)} fechas · {total} endpoints · de la más reciente a la más antigua · fechas de demostración</p>
{chr(10).join(secciones)}
  </main>
</body>
</html>
'''
    (RAIZ / "cambios.html").write_text(pagina, encoding="utf-8")


if __name__ == "__main__":
    main()
