# Magyar Történések MindMap (2006–2026)

[![Next.js](https://img.shields.io/badge/Next.js-14_(App_Router)-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![xyflow](https://img.shields.io/badge/xyflow-React_Flow_12-purple?style=for-the-badge)](https://reactflow.dev/)
[![d3-hierarchy](https://img.shields.io/badge/D3-Hierarchy_3-orange?style=for-the-badge&logo=d3.js&logoColor=white)](https://d3js.org/d3-hierarchy)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

Interaktív, böngészőben futó gondolattérkép és adatvizualizációs alkalmazás, amely a 2006 és 2026 közötti magyarországi politikai, gazdasági és közéleti eseményeket rendszerezi és jeleníti meg összefüggő, hierarchikus gráfként.

---

## Főbb Jellemzők

- **Interaktív Végtelen Vászon:** Teljes pásztázási (Pan) és nagyítási (Zoom) támogatás egérgörgővel, trackpaddal vagy érintőképernyővel az `@xyflow/react` motor segítségével.
- **D3-Hierarchy Elrendezés:** Fa-alapú automatikus elrendezési algoritmus (`d3-hierarchy`), amely dinamikusan rendezi a csomópontokat és kapcsolatokat az áttekinthetőség érdekében.
- **Rendszerezett Adatfa:** Moduláris, JSON-alapú eseménystruktúra (`src/data/mindmap.json`), amely megkönnyíti az adatok bővítését, karbantartását és verziókövetését.
- **Tiszta, Minimalista Felület:** A kártyák és kapcsolatok letisztult vizuális hierarchiával bírnak, segítve az ok-okozati összefüggések azonnali átlátását.

---

## Feldolgozott Témakörök (2006–2026)

A gondolattérkép az alábbi kulcsfontosságú korszakokat és politikai eseményeket dolgozza fel:

1. **Pártpolitikai és koalíciós válságok (2006-tól):**
   * Az Őszödi beszéd kiszivárgása és a 2006-os zavargások.
   * A baloldali kormánypártok politikai és morális válsága.
   * A Fidesz-KDNP új válságnarratívájának megerősödése.
2. **A Nemzeti Együttműködés Rendszerének (NER) megalapozása:**
   * A 2010-es kétharmados választási győzelem és a rendszerváltás lezárásának narratívája.
   * Az új Alaptörvény megalkotása és a kétharmados intézményi átalakítások.
3. **Gazdasági és társadalmi intézkedések:**
   * Egykulcsos adórendszer, bankszektor és energiaszektor szabályozása.
   * Családtámogatási rendszerek és nemzetközi viták (EU / IMF kapcsolatok).
4. **Globális krízisek és politikai átrendeződések:**
   * A 2020-as COVID-19 járványkezelés politikai és gazdasági vetületei.
   * A 2022-es és a 2026-os választások körüli politikai mozgások, új pártformációk megjelenése.

---

## Technológiai Háttér

| Technológia | Verzió | Szerep |
|:---|:---|:---|
| **Next.js** | 14 | App Router, kiszolgáló és SSR keretrendszer |
| **React** | 18 | Reaktív komponens architektúra |
| **TypeScript** | 5 | Típusbiztonságos állapot- és adatkezelés |
| **@xyflow/react** | 12 | Node/Edge renderelés és vászoninterakciók |
| **d3-hierarchy** | 3 | Fa-struktúrát kalkuláló elrendezési algoritmusok |
| **Bun** | 1.x | Gyors csomagkezelő és futtatókörnyezet |

---

## Telepítés és Helyi Futtatás

### Előfeltételek
- [Bun](https://bun.sh/) (ajánlott) vagy [Node.js](https://nodejs.org/) (v18+)

### Lépések
```bash
# 1. Tároló klónozása
git clone https://github.com/CsPS0/MagyarTortenesekMindMap.git
cd MagyarTortenesekMindMap

# 2. Függőségek telepítése
bun install
# vagy: npm install

# 3. Fejlesztői szerver indítása
bun dev
# vagy: npm run dev
```

A felület automatikusan elérhető a böngészőben: **`http://localhost:3000`**

### Építés éles környezetre (Production Build)
```bash
bun run build
bun start
```

---

## Adatstruktúra és Bővítés

Az összes esemény és összefüggés a **`src/data/mindmap.json`** fájlban található, fastruktúrában:

```json
{
  "id": "root",
  "label": "Magyarországi legfontosabb politikai és közéleti események (2006-2026)",
  "children": [
    {
      "id": "partpolitika",
      "label": "Pártpolitikai és koalíciós válságok (2006-napjaink)",
      "children": [
        {
          "id": "oszodi-beszed",
          "label": "Őszödi beszéd és 2006-os zavargások",
          "children": []
        }
      ]
    }
  ]
}
```

Új kategória vagy esemény hozzáadásához elegendő a JSON fát egy új objektummal bővíteni (`id`, `label`, opcionális `children` tömb).

---

## Licenc

Ez a projekt nyílt forráskódú, és az [MIT Licenc](./LICENSE) szerint szabadon tanulmányozható és továbbfejleszthető.  
Készítette: **Solti Csongor Péter** ([@CsPS0](https://github.com/CsPS0))