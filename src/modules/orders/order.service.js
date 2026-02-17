import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

export const createOrder = async (visitorId, { event_id, booth_id, items }) => {
  const client = await import('../../config/db.js').then((m) =>
    m.default.connect()
  );

  try {
    await client.query('BEGIN');

    // 1. Calculate Total Amount
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const { rows } = await client.query(
        'SELECT price FROM menu_items WHERE id = $1',
        [item.menu_item_id]
      );
      if (rows.length === 0)
        throw new AppError(404, `Menu item ${item.menu_item_id} not found`);

      const price = rows[0].price;
      const amount = price * item.quantity;
      totalAmount += amount;

      orderItemsData.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: price,
      });
    }

    // 2. Create Order
    const orderResult = await client.query(
      'INSERT INTO orders (event_id, booth_id, visitor_id, total_amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [event_id, booth_id, visitorId, totalAmount]
    );
    const order = orderResult.rows[0];

    // 3. Create Order Items
    for (const item of orderItemsData) {
      await client.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [order.id, item.menu_item_id, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');
    return { ...order, items: orderItemsData };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getOrderById = async (id) => {
  const { rows } = await query(
    `
    SELECT o.*, json_agg(json_build_object('name', m.name, 'quantity', oi.quantity, 'price', oi.price)) as items
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items m ON oi.menu_item_id = m.id
    WHERE o.id = $1
    GROUP BY o.id
  `,
    [id]
  );

  const order = rows[0];
  if (!order) throw new AppError(404, 'Order not found');
  return order;
};

export const getOrdersByBooth = async (boothId) => {
  const { rows } = await query(
    `
    SELECT o.*, u.name as visitor_name 
    FROM orders o
    LEFT JOIN users u ON o.visitor_id = u.id
    WHERE o.booth_id = $1
    ORDER BY o.created_at DESC
    `,
    [boothId]
  );
  return rows;
};

export const getAllOrders = async () => {
  const { rows } = await query(`
    SELECT o.*, u.name as visitor_name, e.name as event_name
    FROM orders o
    LEFT JOIN users u ON o.visitor_id = u.id
    LEFT JOIN events e ON o.event_id = e.id
    ORDER BY o.created_at DESC
    `);
  return rows;
};

export const updateOrderStatus = async (userId, orderId, status) => {
  // 1. Verify ownership (exhibitor owns the booth of the order)
  const orderResult = await query(
    `
        SELECT o.*, b.exhibitor_id 
        FROM orders o
        JOIN booths b ON o.booth_id = b.id
        WHERE o.id = $1
    `,
    [orderId]
  );

  const order = orderResult.rows[0];
  if (!order) throw new AppError(404, 'Order not found');

  // Admin can update any, Exhibitor only own
  // But this service call usually comes from a controller that knows the context.
  // Ideally we pass userId and check.
  if (userId && order.exhibitor_id !== userId) {
    throw new AppError(403, 'You do not own the booth for this order');
  }

  if (!['new', 'preparing', 'ready', 'completed'].includes(status)) {
    throw new AppError(400, 'Invalid status');
  }

  const { rows } = await query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, orderId]
  );
  return rows[0];
};

export const getSalesReport = async () => {
  const { rows } = await query(`
        SELECT 
            e.name as event_name,
            COUNT(o.id) as total_orders,
            SUM(o.total_amount) as total_revenue
        FROM orders o
        JOIN events e ON o.event_id = e.id
        GROUP BY e.name, e.id
        ORDER BY total_revenue DESC
    `);
  return rows;
};
