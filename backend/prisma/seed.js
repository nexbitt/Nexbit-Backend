import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hash = await bcrypt.hash('123456', 10);

  // ── 1. ROLES ──
  await prisma.roles.createMany({ data: [
    { id_rol: 1, nombre: 'Administrador', descripcion: 'Control total del sistema' },
    { id_rol: 2, nombre: 'Cliente',       descripcion: 'Usuario registrado con acceso a compras' },
    { id_rol: 3, nombre: 'Usuario',       descripcion: 'Visitante no registrado' },
    { id_rol: 4, nombre: 'Repartidor',    descripcion: 'Encargado de entregar pedidos a domicilio' },
  ]});

  // ── 2. USUARIOS ──
  await prisma.usuarios.createMany({ data: [
    { id_usuario: 1, rol_id: 1, nombre: 'Sebastian Admin', email: 'admin@remate.com',   password: hash, numero_documento: '1010', telefono: '3001000001' },
    { id_usuario: 2, rol_id: 2, nombre: 'Juan Cliente',    email: 'juan@email.com',     password: hash, numero_documento: '2020', telefono: '3002000002' },
    { id_usuario: 3, rol_id: 2, nombre: 'Maria Compra',    email: 'maria@email.com',    password: hash, numero_documento: '3030', telefono: '3003000003' },
    { id_usuario: 4, rol_id: 2, nombre: 'Carlos Venta',    email: 'carlos@email.com',   password: hash, numero_documento: '4040', telefono: '3004000004' },
    { id_usuario: 5, rol_id: 2, nombre: 'Ana Gomez',       email: 'ana@email.com',      password: hash, numero_documento: '5050', telefono: '3005000005' },
    { id_usuario: 6, rol_id: 4, nombre: 'Luis Repartidor', email: 'luis@remate.com',    password: hash, numero_documento: '6060', telefono: '3006000006' },
    { id_usuario: 7, rol_id: 4, nombre: 'Paula Envios',    email: 'paula@remate.com',   password: hash, numero_documento: '7070', telefono: '3007000007' },
    { id_usuario: 8, rol_id: 4, nombre: 'Jorge Moto',      email: 'jorge@remate.com',   password: hash, numero_documento: '8080', telefono: '3008000008' },
  ]});

  // ── 3. CATEGORIAS ──
  await prisma.categorias.createMany({ data: [
    { id_categoria: 1, nombre: 'Cocina' },
    { id_categoria: 2, nombre: 'Hogar' },
    { id_categoria: 3, nombre: 'Electronica' },
    { id_categoria: 4, nombre: 'Muebles' },
    { id_categoria: 5, nombre: 'Jardin' },
  ]});

  // ── 4. PROVEEDORES ──
  await prisma.proveedores.createMany({ data: [
    { id_proveedor: 1, nit: '900-1', nombre: 'Mega Plasticos',      activo: true },
    { id_proveedor: 2, nit: '800-2', nombre: 'Importaciones Sol',   activo: true },
    { id_proveedor: 3, nit: '700-3', nombre: 'Distribuidora Hogar', activo: true },
    { id_proveedor: 4, nit: '600-4', nombre: 'Tecno S.A.',          activo: true },
    { id_proveedor: 5, nit: '500-5', nombre: 'Muebles Pro',         activo: true },
  ]});

  // ── 5. PRODUCTOS ──
  await prisma.productos.createMany({ data: [
    { id_producto: 1,  categoria_id: 1, proveedor_id: 1, nombre: 'Juego Utensilios', precio_compra: 3000,  precio_venta: 5000,  stock_actual: 100 },
    { id_producto: 2,  categoria_id: 1, proveedor_id: 1, nombre: 'Colador Pro',      precio_compra: 500,   precio_venta: 1000,  stock_actual: 200 },
    { id_producto: 3,  categoria_id: 2, proveedor_id: 2, nombre: 'Masajeador',       precio_compra: 5000,  precio_venta: 9000,  stock_actual: 50 },
    { id_producto: 4,  categoria_id: 3, proveedor_id: 4, nombre: 'Parlante BT',      precio_compra: 15000, precio_venta: 25000, stock_actual: 30 },
    { id_producto: 5,  categoria_id: 4, proveedor_id: 5, nombre: 'Silla Rattan',     precio_compra: 20000, precio_venta: 35000, stock_actual: 20 },
    { id_producto: 6,  categoria_id: 5, proveedor_id: 3, nombre: 'Matera Barro',     precio_compra: 2000,  precio_venta: 4000,  stock_actual: 80 },
    { id_producto: 7,  categoria_id: 1, proveedor_id: 1, nombre: 'Sarten Teflon',    precio_compra: 8000,  precio_venta: 15000, stock_actual: 45 },
    { id_producto: 8,  categoria_id: 2, proveedor_id: 2, nombre: 'Lampara LED',      precio_compra: 12000, precio_venta: 22000, stock_actual: 15 },
    { id_producto: 9,  categoria_id: 3, proveedor_id: 4, nombre: 'Audifonos',        precio_compra: 7000,  precio_venta: 12000, stock_actual: 60 },
    { id_producto: 10, categoria_id: 4, proveedor_id: 5, nombre: 'Mesa Centro',      precio_compra: 40000, precio_venta: 75000, stock_actual: 10 },
  ]});

  // ── 6. CARRITO ──
  await prisma.carrito.createMany({ data: [
    { usuario_id: 2, producto_id: 1, cantidad: 2 },
    { usuario_id: 2, producto_id: 3, cantidad: 1 },
    { usuario_id: 3, producto_id: 5, cantidad: 1 },
    { usuario_id: 4, producto_id: 9, cantidad: 2 },
    { usuario_id: 5, producto_id: 10, cantidad: 1 },
  ]});

  // ── 7. PEDIDOS ──
  await prisma.pedidos.createMany({ data: [
    { id_pedido: 1,  usuario_id: 2, repartidor_id: 6, subtotal: 17431,  impuesto: 1569,  total: 19000, estado: 'ENTREGADO', direccion_entrega: 'Calle 10 # 5-20, Medellin', fecha_asignacion: new Date('2025-06-01T08:00:00'), fecha_entrega_est: new Date('2025-06-01T12:00:00'), fecha_entrega_real: new Date('2025-06-01T11:30:00') },
    { id_pedido: 2,  usuario_id: 3, subtotal: 30172,  impuesto: 4828,  total: 35000, estado: 'CONFIRMADO', direccion_entrega: 'Carrera 45 # 12-10, Medellin' },
    { id_pedido: 3,  usuario_id: 4, repartidor_id: 7, subtotal: 20690,  impuesto: 3310,  total: 24000, estado: 'EN_CAMINO', direccion_entrega: 'Av. El Poblado # 3-15, Medellin', fecha_asignacion: new Date('2025-06-05T09:00:00'), fecha_entrega_est: new Date('2025-06-05T14:00:00') },
    { id_pedido: 4,  usuario_id: 5, subtotal: 64655,  impuesto: 10345, total: 75000, estado: 'CANCELADO', direccion_entrega: 'Calle 80 # 23-45, Medellin' },
    { id_pedido: 5,  usuario_id: 2, repartidor_id: 6, subtotal: 4310,   impuesto: 690,   total: 5000,  estado: 'ENTREGADO', direccion_entrega: 'Calle 10 # 5-20, Medellin', fecha_asignacion: new Date('2025-06-02T10:00:00'), fecha_entrega_est: new Date('2025-06-02T15:00:00'), fecha_entrega_real: new Date('2025-06-02T14:00:00') },
    { id_pedido: 6,  usuario_id: 3, repartidor_id: 7, subtotal: 12931,  impuesto: 2069,  total: 15000, estado: 'ASIGNADO', direccion_entrega: 'Transversal 39 # 77-50, Medellin', fecha_asignacion: new Date('2025-06-06T08:30:00'), fecha_entrega_est: new Date('2025-06-06T13:00:00') },
    { id_pedido: 7,  usuario_id: 4, repartidor_id: 8, subtotal: 43103,  impuesto: 6897,  total: 50000, estado: 'EN_CAMINO', direccion_entrega: 'Circular 1 # 70-30, Medellin', fecha_asignacion: new Date('2025-06-06T09:00:00'), fecha_entrega_est: new Date('2025-06-06T14:00:00') },
    { id_pedido: 8,  usuario_id: 5, repartidor_id: 6, subtotal: 25862,  impuesto: 4138,  total: 30000, estado: 'ENTREGADO', direccion_entrega: 'Calle 33 # 68-40, Medellin', fecha_asignacion: new Date('2025-06-03T07:00:00'), fecha_entrega_est: new Date('2025-06-03T12:00:00'), fecha_entrega_real: new Date('2025-06-03T11:45:00') },
    { id_pedido: 9,  usuario_id: 2, repartidor_id: 8, subtotal: 8620,   impuesto: 1380,  total: 10000, estado: 'ASIGNADO', direccion_entrega: 'Calle 10 # 5-20, Medellin', fecha_asignacion: new Date('2025-06-06T10:00:00'), fecha_entrega_est: new Date('2025-06-06T16:00:00') },
    { id_pedido: 10, usuario_id: 3, subtotal: 21552,  impuesto: 3448,  total: 25000, estado: 'PENDIENTE', direccion_entrega: 'Carrera 45 # 12-10, Medellin' },
  ]});

  // ── 8. DETALLE PEDIDOS ──
  await prisma.detalle_pedido.createMany({ data: [
    { pedido_id: 1,  producto_id: 1,  cantidad: 2, precio_unitario: 5000,  subtotal: 10000 },
    { pedido_id: 1,  producto_id: 3,  cantidad: 1, precio_unitario: 9000,  subtotal: 9000 },
    { pedido_id: 2,  producto_id: 5,  cantidad: 1, precio_unitario: 35000, subtotal: 35000 },
    { pedido_id: 3,  producto_id: 9,  cantidad: 2, precio_unitario: 12000, subtotal: 24000 },
    { pedido_id: 4,  producto_id: 10, cantidad: 1, precio_unitario: 75000, subtotal: 75000 },
    { pedido_id: 6,  producto_id: 7,  cantidad: 1, precio_unitario: 15000, subtotal: 15000 },
    { pedido_id: 7,  producto_id: 4,  cantidad: 1, precio_unitario: 25000, subtotal: 25000 },
    { pedido_id: 7,  producto_id: 8,  cantidad: 1, precio_unitario: 22000, subtotal: 22000 },
    { pedido_id: 8,  producto_id: 1,  cantidad: 3, precio_unitario: 5000,  subtotal: 15000 },
    { pedido_id: 8,  producto_id: 2,  cantidad: 2, precio_unitario: 1000,  subtotal: 2000 },
    { pedido_id: 9,  producto_id: 9,  cantidad: 1, precio_unitario: 12000, subtotal: 12000 },
    { pedido_id: 10, producto_id: 3,  cantidad: 1, precio_unitario: 9000,  subtotal: 9000 },
    { pedido_id: 10, producto_id: 6,  cantidad: 2, precio_unitario: 4000,  subtotal: 8000 },
  ]});

  // ── 9. FACTURAS ──
  await prisma.facturas.createMany({ data: [
    { pedido_id: 1,  numero_factura: 'F-001', subtotal: 17431,  impuesto: 1569,  total: 19000, estado: 'PAGADA' },
    { pedido_id: 2,  numero_factura: 'F-002', subtotal: 30172,  impuesto: 4828,  total: 35000, estado: 'EMITIDA' },
    { pedido_id: 3,  numero_factura: 'F-003', subtotal: 20690,  impuesto: 3310,  total: 24000, estado: 'EMITIDA' },
    { pedido_id: 4,  numero_factura: 'F-004', subtotal: 64655,  impuesto: 10345, total: 75000, estado: 'ANULADA' },
    { pedido_id: 5,  numero_factura: 'F-005', subtotal: 4310,   impuesto: 690,   total: 5000,  estado: 'PAGADA' },
    { pedido_id: 6,  numero_factura: 'F-006', subtotal: 12931,  impuesto: 2069,  total: 15000, estado: 'EMITIDA' },
    { pedido_id: 7,  numero_factura: 'F-007', subtotal: 43103,  impuesto: 6897,  total: 50000, estado: 'EMITIDA' },
    { pedido_id: 8,  numero_factura: 'F-008', subtotal: 25862,  impuesto: 4138,  total: 30000, estado: 'PAGADA' },
    { pedido_id: 9,  numero_factura: 'F-009', subtotal: 8620,   impuesto: 1380,  total: 10000, estado: 'EMITIDA' },
    { pedido_id: 10, numero_factura: 'F-010', subtotal: 21552,  impuesto: 3448,  total: 25000, estado: 'EMITIDA' },
  ]});

  // ── 10. SEGUIMIENTO PEDIDO ──
  await prisma.seguimiento_pedido.createMany({ data: [
    { pedido_id: 1,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 1,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado' },
    { pedido_id: 1,  estado_anterior: 'CONFIRMADO', estado_nuevo: 'ASIGNADO',   cambiado_por: 1, notas: 'Asignado a Luis Repartidor' },
    { pedido_id: 1,  estado_anterior: 'ASIGNADO',   estado_nuevo: 'ENTREGADO',  cambiado_por: 6, notas: 'Entregado exitosamente al cliente' },
    { pedido_id: 2,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 2,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado, pendiente asignacion' },
    { pedido_id: 3,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 3,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado' },
    { pedido_id: 3,  estado_anterior: 'CONFIRMADO', estado_nuevo: 'ASIGNADO',   cambiado_por: 1, notas: 'Asignado a Paula Envios' },
    { pedido_id: 3,  estado_anterior: 'ASIGNADO',   estado_nuevo: 'EN_CAMINO',  cambiado_por: 7, notas: 'Paula salio a entregar' },
    { pedido_id: 4,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 4,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CANCELADO',  cambiado_por: 1, notas: 'Cancelado por el cliente' },
    { pedido_id: 5,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 5,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado' },
    { pedido_id: 5,  estado_anterior: 'CONFIRMADO', estado_nuevo: 'ASIGNADO',   cambiado_por: 1, notas: 'Asignado a Luis Repartidor' },
    { pedido_id: 5,  estado_anterior: 'ASIGNADO',   estado_nuevo: 'EN_CAMINO',  cambiado_por: 6, notas: 'Luis salio a entregar' },
    { pedido_id: 5,  estado_anterior: 'EN_CAMINO',  estado_nuevo: 'ENTREGADO',  cambiado_por: 6, notas: 'Entregado antes del tiempo estimado' },
    { pedido_id: 6,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 6,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado' },
    { pedido_id: 6,  estado_anterior: 'CONFIRMADO', estado_nuevo: 'ASIGNADO',   cambiado_por: 1, notas: 'Asignado a Paula Envios' },
    { pedido_id: 7,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 7,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado' },
    { pedido_id: 7,  estado_anterior: 'CONFIRMADO', estado_nuevo: 'ASIGNADO',   cambiado_por: 1, notas: 'Asignado a Jorge Moto' },
    { pedido_id: 7,  estado_anterior: 'ASIGNADO',   estado_nuevo: 'EN_CAMINO',  cambiado_por: 8, notas: 'Jorge salio en moto' },
    { pedido_id: 8,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 8,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado' },
    { pedido_id: 8,  estado_anterior: 'CONFIRMADO', estado_nuevo: 'ASIGNADO',   cambiado_por: 1, notas: 'Asignado a Luis Repartidor' },
    { pedido_id: 8,  estado_anterior: 'ASIGNADO',   estado_nuevo: 'EN_CAMINO',  cambiado_por: 6, notas: 'Luis en camino' },
    { pedido_id: 8,  estado_anterior: 'EN_CAMINO',  estado_nuevo: 'ENTREGADO',  cambiado_por: 6, notas: 'Entrega completada' },
    { pedido_id: 9,  estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado' },
    { pedido_id: 9,  estado_anterior: 'PENDIENTE',  estado_nuevo: 'CONFIRMADO', cambiado_por: 1, notas: 'Pago verificado' },
    { pedido_id: 9,  estado_anterior: 'CONFIRMADO', estado_nuevo: 'ASIGNADO',   cambiado_por: 1, notas: 'Asignado a Jorge Moto' },
    { pedido_id: 10, estado_nuevo: 'PENDIENTE',  cambiado_por: 1, notas: 'Pedido creado, sin pago aun' },
  ]});

  // ── 11. MOVIMIENTOS INVENTARIO ──
  await prisma.movimientos_inventario.createMany({ data: [
    { producto_id: 1,  usuario_id: 1, tipo_movimiento: 'ENTRADA', cantidad: 100, referencia: 'Stock inicial - Juego Utensilios' },
    { producto_id: 2,  usuario_id: 1, tipo_movimiento: 'ENTRADA', cantidad: 200, referencia: 'Stock inicial - Colador Pro' },
    { producto_id: 3,  usuario_id: 1, tipo_movimiento: 'ENTRADA', cantidad: 50,  referencia: 'Stock inicial - Masajeador' },
    { producto_id: 4,  usuario_id: 1, tipo_movimiento: 'ENTRADA', cantidad: 30,  referencia: 'Stock inicial - Parlante BT' },
    { producto_id: 5,  usuario_id: 1, tipo_movimiento: 'ENTRADA', cantidad: 20,  referencia: 'Stock inicial - Silla Rattan' },
    { producto_id: 1,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 2,   referencia: 'Pedido F-001' },
    { producto_id: 3,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 1,   referencia: 'Pedido F-001' },
    { producto_id: 5,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 1,   referencia: 'Pedido F-002' },
    { producto_id: 9,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 2,   referencia: 'Pedido F-003' },
    { producto_id: 10, usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 1,   referencia: 'Pedido F-004' },
    { producto_id: 7,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 1,   referencia: 'Pedido F-006' },
    { producto_id: 4,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 1,   referencia: 'Pedido F-007' },
    { producto_id: 8,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 1,   referencia: 'Pedido F-007' },
    { producto_id: 1,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 3,   referencia: 'Pedido F-008' },
    { producto_id: 2,  usuario_id: 1, tipo_movimiento: 'VENTA',   cantidad: 2,   referencia: 'Pedido F-008' },
    { producto_id: 6,  usuario_id: 1, tipo_movimiento: 'COMPRA',  cantidad: 50,  referencia: 'Reabastecimiento Matera Barro' },
    { producto_id: 9,  usuario_id: 1, tipo_movimiento: 'AJUSTE',  cantidad: -3,  referencia: 'Ajuste por producto danado en bodega' },
    { producto_id: 4,  usuario_id: 1, tipo_movimiento: 'COMPRA',  cantidad: 20,  referencia: 'Reabastecimiento Parlante BT' },
  ]});

  console.log('Seed completed successfully');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
