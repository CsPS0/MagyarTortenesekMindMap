# Magyar Történések MindMap (2006–2026)

[![Next.js](https://img.shields.io/badge/Next.js-14_(App_Router)-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![xyflow](https://img.shields.io/badge/xyflow-React_Flow_12-purple?style=for-the-badge)](https://reactflow.dev/)
[![d3-hierarchy](https://img.shields.io/badge/D3-Hierarchy_3-orange?style=for-the-badge&logo=d3.js&logoColor=white)](https://d3js.org/d3-hierarchy)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

Interaktív gondolattérkép a 2006–2026 közötti magyarországi politikai és közéleti események vizualizálásához. A projekt immáron teljesértékű Full-Stack architektúrával, adatbázissal és kibővített UI funkciókkal (MindMap 2.0) rendelkezik!

## Új funkciók
- **Nézetválasztás:** Klasszikus "Térkép" mód és teljesen új kronológiai "Idővonal" (Timeline) mód az események időrendi áttekintéséhez.
- **Interaktív UI:** Keresőmező intelligens fókuszálással, oldalsó információs panel (Drawer), áthelyezett Mini-térkép és egyedi navigációs panel.
- **Fejlett Navigáció:** Húzd arrébb a kártyákat és a rendszer automatikusan megjegyzi (`localStorage`) a módosításaidat! Beépítettük a Visszavonás (`Ctrl+Z`) és az Újra (`Ctrl+Y`) funkciókat is, valamint egy Reset gombot.
- **Dinamikus fa:** Összecsukható/kinyitható ágak, melyekre azonnal reagál a D3 elrendező algoritmus. Az elrendezés ütközésvizsgálattal (collision detection) is bővült.
- **Kép exportálás:** Egykattintásos PNG mentési lehetőség a testreszabás menüből.
- **Vizuális tuning:** Színkódolt kártyák a hierarchiai szint alapján, sötét és világos mód támogatás, reszponzív design.
- **Adatbázis integráció:** SQLite + Prisma ORM biztosítja a perzisztenciát egy Next.js Route Handler (`/api/mindmap`) segítségével.

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
| **Prisma** | 5 | ORM és adatbázis-kezelés |
| **SQLite** | - | Relációs adatbázis |
| **html-to-image** | 1.11 | PNG kép exportálás |
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

# 3. Adatbázis inicializálása és migráció
bunx prisma migrate dev

# 4. Adatbázis feltöltése a kezdeti adatokkal (seed)
bun run prisma/seed.ts

# 5. Fejlesztői szerver indítása
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

## Adatbázis és Szerkesztés

Az adatok immáron nem statikus JSON fájlból érkeznek, hanem az SQLite adatbázisból (`dev.db`); a kezdeti adatokat a seed a `src/data/mindmap.json` fájlból tölti be. 
A legegyszerűbb módja az adatok (pl. dátumok, részletes leírások, linkek) szerkesztésének a **Prisma Studio** használata:

```bash
# Prisma Studio indítása
bunx prisma studio
```
Ez megnyit egy webes admin felületet, ahol kényelmesen szerkesztheted a `Node` és `Link` táblákat.

### Adatstruktúra (Prisma Schema)

```prisma
model Node {
  id          String   @id
  label       String
  description String?  // Opcionális részletes leírás
  date        String?  // Opcionális dátum
  parentId    String?
  parent      Node?    @relation("NodeHierarchy", fields: [parentId], references: [id])
  children    Node[]   @relation("NodeHierarchy")
  links       Link[]   // Külső hivatkozások listája
}

model Link {
  id     Int    @id @default(autoincrement())
  url    String
  nodeId String
  node   Node   @relation(fields: [nodeId], references: [id])
}
```

---

## Licenc

Ez a projekt nyílt forráskódú, és az [MIT Licenc](./LICENSE) szerint szabadon tanulmányozható és továbbfejleszthető.  
Készítette: **Solti Csongor Péter** ([@CsPS0](https://github.com/CsPS0))