import { query } from '../../config/db.js';
import { AppError } from '../../utils/appError.js';

// Allowed status transition chain
const STATUS_TRANSITIONS = {
  new: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
};

export const createOrder = async (visitorId, { event_id, booth_id, items }) => {
  const client = await import('../../config/db.js').then((m) =>
    m.default.connect()
  );

  try {
    await client.query('BEGIN');

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const { rows } = await client.query(
        'SELECT price, availability FROM menu_items WHERE id = $1',
        [item.menu_item_id]
      );
      if (rows.length === 0)
        throw new AppError(404, `Menu item ${item.menu_item_id} not found`);
      if (!rows[0].availability)
        throw new AppError(
          400,
          `Menu item ${item.menu_item_id} is currently unavailable`
        );

      const price = rows[0].price;
      totalAmount += price * item.quantity;
      orderItemsData.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price,
      });
    }

    const orderResult = await client.query(
      `INSERT INTO orders (event_id, booth_id, visitor_id, total_amount, status)
       VALUES ($1, $2, $3, $4, 'new') RETURNING *`,
      [event_id, booth_id, visitorId, totalAmount]
    );
    const order = orderResult.rows[0];

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

/**
 * Get a single order by ID.
 * Security:
 *   - visitor: can only see their own orders
 *   - exhibitor: can only see orders for their booths
 *   - admin: unrestricted
 */
export const getOrderById = async (id, requesterId, role) => {
  const { rows } = await query(
    `SELECT o.*,
            u.name  AS visitor_name,
            b.booth_number,
            e.name  AS event_name,
            json_agg(
              json_build_object(
                'menu_item_id', oi.menu_item_id,
                'name',     m.name,
                'quantity', oi.quantity,
                'price',    oi.price
              )
            ) AS items
     FROM orders o
     LEFT JOIN users  u  ON o.visitor_id = u.id
     LEFT JOIN booths b  ON o.booth_id  = b.id
     LEFT JOIN events e  ON o.event_id  = e.id
     LEFT JOIN order_items oi ON o.id  = oi.order_id
     LEFT JOIN menu_items  m  ON oi.menu_item_id = m.id
     WHERE o.id = $1
     GROUP BY o.id, u.name, b.booth_number, e.name`,
    [id]
  );
  const order = rows[0];
  if (!order) throw new AppError(404, 'Order not found');

  // Visitor can only view their own order
  if (role === 'visitor' && order.visitor_id !== requesterId) {
    throw new AppError(403, 'You do not have access to this order');
  }

  // Exhibitor can only view orders for their booths
  if (role === 'exhibitor') {
    const boothCheck = await query(
      'SELECT exhibitor_id FROM booths WHERE id = $1',
      [order.booth_id]
    );
    if (
      !boothCheck.rows[0] ||
      boothCheck.rows[0].exhibitor_id !== requesterId
    ) {
      throw new AppError(403, 'You do not have access to this order');
    }
  }

  return order;
};

/**
 * Exhibitor-scoped: verifies that the booth belongs to the requesting user.
 */
export const getOrdersByBooth = async (boothId, userId) => {
  // Booth ownership guard
  const boothCheck = await query(
    'SELECT exhibitor_id FROM booths WHERE id = $1',
    [boothId]
  );
  if (!boothCheck.rows[0]) throw new AppError(404, 'Booth not found');
  if (userId && boothCheck.rows[0].exhibitor_id !== userId) {
    throw new AppError(403, 'You do not own this booth');
  }

  const { rows } = await query(
    `SELECT o.*,
            u.name as visitor_name,
            json_agg(
              json_build_object('name', m.name, 'quantity', oi.quantity, 'price', oi.price)
            ) as items
     FROM orders o
     LEFT JOIN users u ON o.visitor_id = u.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE o.booth_id = $1
     GROUP BY o.id, u.name
     ORDER BY o.created_at DESC`,
    [boothId]
  );
  return rows;
};

export const getAllOrders = async () => {
  const { rows } = await query(`
    SELECT o.*, u.name as visitor_name, e.name as event_name,
           b.booth_number
    FROM orders o
    LEFT JOIN users  u ON o.visitor_id = u.id
    LEFT JOIN events e ON o.event_id   = e.id
    LEFT JOIN booths b ON o.booth_id   = b.id
    ORDER BY o.created_at DESC
  `);
  return rows;
};

/**
 * Enforces allowed transition chain: new → preparing → ready → completed.
 */
export const updateOrderStatus = async (userId, orderId, newStatus) => {
  if (!newStatus) throw new AppError(400, 'status is required');

  const orderResult = await query(
    `SELECT o.*, b.exhibitor_id 
     FROM orders o
     JOIN booths b ON o.booth_id = b.id
     WHERE o.id = $1`,
    [orderId]
  );
  const order = orderResult.rows[0];
  if (!order) throw new AppError(404, 'Order not found');

  // Ownership check
  if (userId && order.exhibitor_id !== userId) {
    throw new AppError(403, 'You do not own the booth for this order');
  }

  const currentStatus = order.status;
  const allowed = STATUS_TRANSITIONS[currentStatus];

  if (!allowed) {
    throw new AppError(400, `Unknown current status: ${currentStatus}`);
  }
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      400,
      `Invalid transition: ${currentStatus} → ${newStatus}. ` +
        `Allowed: ${allowed.length ? allowed.join(', ') : 'none (final state)'}`
    );
  }

  const { rows } = await query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [newStatus, orderId]
  );
  return rows[0];
};

export const getSalesReport = async () => {
  const { rows } = await query(`
    SELECT 
      e.name          AS event_name,
      COUNT(o.id)     AS total_orders,
      SUM(o.total_amount) AS total_revenue
    FROM orders o
    JOIN events e ON o.event_id = e.id
    GROUP BY e.name, e.id
    ORDER BY total_revenue DESC
  `);
  return rows;
};

/**
 * Dashboard stats for logged-in exhibitor.
 */
export const getMyStats = async (userId) => {
  const { rows } = await query(
    `SELECT 
       COUNT(DISTINCT o.id)                                                    AS total_orders,
       COALESCE(SUM(o.total_amount), 0)                                        AS total_sales,
       COUNT(DISTINCT CASE WHEN o.status = 'new' THEN o.id END)               AS pending_orders,
       COUNT(DISTINCT CASE WHEN DATE(o.created_at) = CURRENT_DATE THEN o.id END) AS today_orders
     FROM orders o
     JOIN booths b ON o.booth_id = b.id
     WHERE b.exhibitor_id = $1`,
    [userId]
  );
  return rows[0];
};

/**
 * Exhibitor Sales Report: revenue and order count per booth, filtered by boothId.
 */
export const getExhibitorSalesReport = async (userId, boothId) => {
  // Verify ownership
  const boothCheck = await query(
    'SELECT exhibitor_id FROM booths WHERE id = $1',
    [boothId]
  );
  if (!boothCheck.rows[0]) throw new AppError(404, 'Booth not found');
  if (boothCheck.rows[0].exhibitor_id !== userId)
    throw new AppError(403, 'You do not own this booth');

  const { rows } = await query(
    `SELECT 
       b.booth_number,
       e.name                                     AS event_name,
       COUNT(o.id)                                AS total_orders,
       COALESCE(SUM(o.total_amount), 0)           AS total_revenue,
       COUNT(CASE WHEN o.status = 'completed' THEN o.id END) AS completed_orders,
       COUNT(CASE WHEN o.status = 'new' THEN o.id END)       AS pending_orders
     FROM orders o
     JOIN booths b ON o.booth_id = b.id
     JOIN events e ON b.event_id = e.id
     WHERE o.booth_id = $1
     GROUP BY b.booth_number, e.name`,
    [boothId]
  );
  return (
    rows[0] || {
      total_orders: 0,
      total_revenue: 0,
      completed_orders: 0,
      pending_orders: 0,
    }
  );
};

export const getMyOrders = async (userId) => {
  const boothResult = await query(
    'SELECT id FROM booths WHERE exhibitor_id = $1',
    [userId]
  );
  if (boothResult.rows.length === 0) return [];

  const boothIds = boothResult.rows.map((b) => b.id);

  const { rows } = await query(
    `SELECT o.*, u.name as visitor_name,
            json_agg(
              json_build_object('name', m.name, 'quantity', oi.quantity, 'price', oi.price)
            ) as items
     FROM orders o
     LEFT JOIN users u ON o.visitor_id = u.id
     LEFT JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE o.booth_id = ANY($1)
     GROUP BY o.id, u.name
     ORDER BY o.created_at DESC`,
    [boothIds]
  );
  return rows;
};

/**
 * Visitor: Get all their own orders, with pagination and optional status filter.
 * @param {string} visitorId - logged-in visitor's user ID
 * @param {object} options - { status, page, limit }
 */
export const getMyOrdersForVisitor = async (
  visitorId,
  { status, page = 1, limit = 10 }
) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const params = [visitorId];
  let whereExtra = '';
  if (status) {
    params.push(status);
    whereExtra = `AND o.status = $${params.length}`;
  }

  // Count total for pagination
  const countRes = await query(
    `SELECT COUNT(DISTINCT o.id) FROM orders o WHERE o.visitor_id = $1 ${whereExtra}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  // Add pagination params
  params.push(parseInt(limit, 10));
  params.push(offset);

  const { rows } = await query(
    `SELECT
       o.id,
       o.status,
       o.total_amount,
       o.created_at,
       b.booth_number,
       e.name  AS event_name,
       e.date  AS event_date,
       json_agg(
         json_build_object(
           'name',     m.name,
           'quantity', oi.quantity,
           'price',    oi.price,
           'image_url', m.image_url
         )
       ) AS items
     FROM orders o
     JOIN booths  b  ON o.booth_id  = b.id
     JOIN events  e  ON o.event_id  = e.id
     LEFT JOIN order_items oi ON o.id          = oi.order_id
     LEFT JOIN menu_items  m  ON oi.menu_item_id = m.id
     WHERE o.visitor_id = $1
     ${whereExtra}
     GROUP BY o.id, b.booth_number, e.name, e.date
     ORDER BY o.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    data: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};
