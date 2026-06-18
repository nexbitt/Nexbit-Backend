import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create roles
  const roles = [
    { id_rol: 1, nombre: 'Administrador', descripcion: 'Rol de administrador general' },
    { id_rol: 2, nombre: 'Cliente', descripcion: 'Rol de cliente' },
    { id_rol: 3, nombre: 'Operador', descripcion: 'Rol de operador' },
    { id_rol: 4, nombre: 'Repartidor', descripcion: 'Rol de repartidor' },
  ];

  for (const r of roles) {
    await prisma.roles.upsert({
      where: { id_rol: r.id_rol },
      update: { nombre: r.nombre, descripcion: r.descripcion },
      create: r,
    });
  }
  console.log('Roles seeded successfully.');

  // Create admin user
  const adminEmail = 'admin@remate.com';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.usuarios.upsert({
    where: { email: adminEmail },
    update: {
      rol_id: 1,
      nombre: 'Admin General',
      password: hashedPassword,
      activo: true,
    },
    create: {
      rol_id: 1,
      nombre: 'Admin General',
      email: adminEmail,
      password: hashedPassword,
      activo: true,
    },
  });

  console.log('Admin user seeded:', adminUser.email);
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
