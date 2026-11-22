import { PrismaClient } from '@prisma/client';
import mindmapData from '../src/data/mindmap.json';

const prisma = new PrismaClient();

async function seedNode(node: any, parentId: string | null = null) {
  // Insert the current node
  await prisma.node.create({
    data: {
      id: node.id,
      label: node.label,
      description: node.description || null,
      date: node.date || null,
      parentId: parentId,
      links: {
        create: (node.links || []).map((url: string) => ({ url }))
      }
    }
  });

  // Recursively insert children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await seedNode(child, node.id);
    }
  }
}

async function main() {
  console.log("Seeding database...");
  
  // Clear existing data
  await prisma.link.deleteMany();
  await prisma.node.deleteMany();
  
  // The JSON structure is a single root object
  await seedNode(mindmapData);
  
  console.log("Seeding finished.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
