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
    ultima = max(v["fecha"] for v in versiones)
    secciones = []
    for v in versiones:
        tags = []
        for g in v["apis"]:
            tags.append(f'<a class="api" href="./#{e(g["id"])}">{e(g["api"].removeprefix("API de "))}</a>')
            for ep in g["endpoints"]:
                tags.append(f'<code class="endpoint" title="{e(ep["resumen"])}">'
                            f'<span class="metodo">{e(ep["metodo"])}</span> {e(ep["ruta"])}</code>')
        latest = ' <span class="latest">Latest</span>' if v["fecha"] == ultima else ""
        secciones.append(f'''    <section class="fecha" id="{e(v["fecha"])}">
      <h2><time datetime="{e(v["fecha"])}">{e(v["fecha"])}</time>{latest}</h2>
      <p class="tags">{"".join(tags)}</p>
    </section>''')
    pagina = f'''<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Historial de cambios · fechas y endpoints</title>
  <style>
    body {{ font: 16px/1.6 system-ui, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; background: #fff; color: #1c2230; }}
    main {{ max-width: 1100px; margin: 0 auto; padding: 24px 24px 48px; }}
    a {{ color: #2457d6; }}
    h1 {{ margin: 8px 0 8px; font-size: 2.2rem; }}
    .fecha {{ padding: 22px 0 20px; border-bottom: 1px solid #e1e5ec; }}
    .fecha h2 {{ margin: 0; font-size: 1.45rem; font-weight: 600; display: flex; align-items: center; gap: 12px; }}
    .latest {{ font-size: 1.05rem; font-weight: 500; color: #2457d6; background: #e8eefc; padding: 4px 16px; border-radius: 999px; }}
    .tags {{ margin: 10px 0 0; display: flex; flex-wrap: wrap; gap: 4px 14px; color: #5b6475; }}
    .tags a, .tags code {{ color: #5b6475; text-decoration: none; font: inherit; }}
    .tags a:hover {{ color: #2457d6; text-decoration: underline; }}
  </style>
</head>
<body>
  <main>
    <p><a href="./#inicio">← Volver al inicio</a></p>
    <h1>Historial de cambios</h1>
{chr(10).join(secciones)}
  </main>
</body>
</html>
'''
    (RAIZ / "cambios.html").write_text(pagina, encoding="utf-8")


if __name__ == "__main__":
    main()
