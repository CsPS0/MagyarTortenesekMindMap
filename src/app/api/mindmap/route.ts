import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const nodes = await prisma.node.findMany({
      include: {
        links: true,
      },
    });

    if (nodes.length === 0) {
      return NextResponse.json({ id: "root", label: "No data", children: [] });
    }

    // Create a map for quick lookup
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.id, {
        id: node.id,
        label: node.label,
        description: node.description,
        date: node.date,
        links: node.links.map(link => link.url),
        children: []
      });
    });

    let rootNode = null;

    // Build the tree
    nodes.forEach(node => {
      const current = nodeMap.get(node.id);
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(current);
        }
      } else {
        // Assume only one root exists, or just take the first one found without parent
        if (!rootNode) rootNode = current;
      }
    });

    return NextResponse.json(rootNode);
  } catch (error) {
    console.error("Failed to fetch mindmap data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
