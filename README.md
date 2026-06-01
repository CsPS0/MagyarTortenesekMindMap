# Magyar Történések MindMap

Interaktív gondolattérkép a 2006–2026 közötti magyarországi politikai és közéleti események vizualizálásához.

## Tech stack

<div align="left">

| Technológia | Verzió | Szerep |
|:---|:---|:---|
| **Next.js** | 14 | App Router, SSR keretrendszer |
| **React** | 18 | UI komponensek |
| **TypeScript** | 5 | Típusbiztonság |
| **@xyflow/react** | 12 | Interaktív gráf renderelés |
| **d3-hierarchy** | 3 | Fa-alapú elrendezési algoritmus |

</div>


## Telepítés és futtatás

```bash
# Függőségek telepítése
bun install

# Fejlesztői szerver indítása
bun dev

# Produkciós build
bun run build
bun start
```

A fejlesztői szerver elérhető: [http://localhost:3000](http://localhost:3000)

## Adatstruktúra

Az események a `src/data/mindmap.json` fájlban találhatók, beágyazott fa-struktúrában:

```json
{
  "id": "root",
  "label": "Főcím",
  "children": [
    {
      "id": "child-1",
      "label": "Gyermek elem",
      "children": []
    }
  ]
}
```

Új események hozzáadásához egyszerűen bővítsd a JSON fát egy új objektummal (`id` + `label` + opcionális `children`).

## Licenc

[MIT](LICENSE) – © 2026 Solti Csongor Péter
