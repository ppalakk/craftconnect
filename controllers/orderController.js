const orderStore = require("../lib/orderStore");
const { sessionUser } = require("../middleware/auth");

/**
 * Controller: Order Management & Fulfillment
 */

// GET /api/orders
async function getOrders(req, res) {
  try {
    const user = sessionUser(req);
    const filter = (req.query.status || "all").toLowerCase();

    // Get all orders for computing counts
    const allOrders = await orderStore.getOrdersForUser(user, "all");
    const pendingCount = allOrders.filter((o) => o.status === "pending").length;
    const dispatchedCount = allOrders.filter((o) => o.status === "dispatched").length;

    let filtered = allOrders;
    if (filter === "pending") {
      filtered = allOrders.filter((o) => o.status === "pending");
    } else if (filter === "dispatched") {
      filtered = allOrders.filter((o) => o.status === "dispatched");
    }

    res.json({
      ok: true,
      orders: filtered,
      counts: {
        all: allOrders.length,
        pending: pendingCount,
        dispatched: dispatchedCount,
      },
      filter,
      artisan: user ? { id: user.id || user._id, name: user.name, email: user.email } : { name: "Sita Devi", email: "sita@artisan.com" },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to retrieve orders",
      message: error.message,
    });
  }
}

// POST /api/orders/:id/dispatch
async function dispatchOrder(req, res) {
  try {
    const user = sessionUser(req);
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ ok: false, error: "Order ID is required" });
    }

    const updated = await orderStore.updateOrderStatus(orderId, "dispatched", user);

    res.json({
      ok: true,
      order: updated,
      message: "Order marked as dispatched successfully",
      dispatchedBy: user ? user.name : "Artisan",
      id: orderId,
      status: "dispatched",
    });
  } catch (error) {
    console.error("Error dispatching order:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to update order dispatch status",
      message: error.message,
    });
  }
}

// POST /api/orders
async function createOrder(req, res) {
  try {
    const user = sessionUser(req);
    const orderData = req.body;

    if (!orderData || !orderData.item || !orderData.amount) {
      return res.status(400).json({ ok: false, error: "Missing required order fields" });
    }

    const newOrder = await orderStore.createOrder(orderData, user);
    res.status(201).json({
      ok: true,
      order: newOrder,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to create order",
      message: error.message,
    });
  }
}

module.exports = {
  getOrders,
  dispatchOrder,
  createOrder,
};

