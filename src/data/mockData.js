// Mock data layer — stands in for backend API responses during the UI-first build.
// Every page reads from here through src/services/*, so swapping to real axios
// calls later only means changing the services layer, not the components.

export const mockUsers = [
  { id: "u1", name: "Ava Whitfield", email: "admin@stockpilot.io", role: "Admin", avatarColor: "#F5C518" },
  { id: "u2", name: "Marcus Reyes", email: "manager@stockpilot.io", role: "Manager", avatarColor: "#4C8DFF" },
  { id: "u3", name: "Priya Nair", email: "employee@stockpilot.io", role: "Employee", avatarColor: "#33C481" },
];

export const mockCategories = [
  { id: "c1", name: "Power Tools", productCount: 18, description: "Cordless & corded power equipment" },
  { id: "c2", name: "Hand Tools", productCount: 24, description: "Wrenches, hammers, screwdrivers" },
  { id: "c3", name: "Safety Gear", productCount: 12, description: "PPE and protective equipment" },
  { id: "c4", name: "Fasteners", productCount: 41, description: "Bolts, screws, anchors" },
  { id: "c5", name: "Electrical", productCount: 15, description: "Wiring, conduit, switches" },
];

export const mockSuppliers = [
  { id: "s1", name: "Northgate Distribution", contact: "Lena Ford", email: "lena@northgate.co", phone: "+1 415 555 0132", productsSupplied: 32, rating: 4.6 },
  { id: "s2", name: "Ironclad Wholesale", contact: "Diego Marin", email: "diego@ironclad.co", phone: "+1 312 555 0187", productsSupplied: 21, rating: 4.2 },
  { id: "s3", name: "Summit Hardware Co.", contact: "Rachel Kim", email: "rachel@summithw.com", phone: "+1 206 555 0144", productsSupplied: 18, rating: 4.8 },
  { id: "s4", name: "Pacific Fastener Supply", contact: "Omar Haddad", email: "omar@pacfast.com", phone: "+1 503 555 0199", productsSupplied: 27, rating: 4.4 },
];

// stockStatus is derived (in / low / out) but stored here for the UI-first mock
export const mockProducts = [
  { id: "p1", sku: "PWR-2201", name: "18V Cordless Drill", category: "Power Tools", supplier: "Northgate Distribution", price: 89.99, cost: 54.0, quantity: 42, reorderLevel: 15, stockStatus: "in", velocity: "fast", expiry: null, updated: "2026-07-28" },
  { id: "p2", sku: "PWR-2214", name: "Angle Grinder 4.5in", category: "Power Tools", supplier: "Northgate Distribution", price: 64.5, cost: 38.2, quantity: 8, reorderLevel: 12, stockStatus: "low", velocity: "fast", expiry: null, updated: "2026-07-30" },
  { id: "p3", sku: "HND-1042", name: "Claw Hammer 16oz", category: "Hand Tools", supplier: "Summit Hardware Co.", price: 18.75, cost: 9.4, quantity: 130, reorderLevel: 30, stockStatus: "in", velocity: "slow", expiry: null, updated: "2026-07-25" },
  { id: "p4", sku: "HND-1077", name: "Adjustable Wrench 10in", category: "Hand Tools", supplier: "Summit Hardware Co.", price: 22.0, cost: 11.5, quantity: 0, reorderLevel: 20, stockStatus: "out", velocity: "fast", expiry: null, updated: "2026-07-31" },
  { id: "p5", sku: "SFT-3305", name: "Safety Goggles (Clear)", category: "Safety Gear", supplier: "Ironclad Wholesale", price: 6.5, cost: 2.8, quantity: 210, reorderLevel: 50, stockStatus: "in", velocity: "fast", expiry: "2027-03-01", updated: "2026-07-29" },
  { id: "p6", sku: "SFT-3320", name: "Nitrile Gloves (Box 100)", category: "Safety Gear", supplier: "Ironclad Wholesale", price: 14.25, cost: 8.1, quantity: 6, reorderLevel: 25, stockStatus: "low", velocity: "fast", expiry: "2026-08-15", updated: "2026-07-30" },
  { id: "p7", sku: "FST-5510", name: "M8 Hex Bolt (Pack 200)", category: "Fasteners", supplier: "Pacific Fastener Supply", price: 11.0, cost: 5.4, quantity: 340, reorderLevel: 60, stockStatus: "in", velocity: "slow", expiry: null, updated: "2026-07-20" },
  { id: "p8", sku: "FST-5522", name: "Wall Anchor Kit", category: "Fasteners", supplier: "Pacific Fastener Supply", price: 9.4, cost: 4.6, quantity: 18, reorderLevel: 20, stockStatus: "low", velocity: "slow", expiry: null, updated: "2026-07-27" },
  { id: "p9", sku: "ELC-7701", name: "12AWG Wire Spool 100ft", category: "Electrical", supplier: "Northgate Distribution", price: 41.0, cost: 26.0, quantity: 0, reorderLevel: 10, stockStatus: "out", velocity: "slow", expiry: null, updated: "2026-07-22" },
  { id: "p10", sku: "ELC-7715", name: "Duplex Outlet (10 pack)", category: "Electrical", supplier: "Ironclad Wholesale", price: 27.5, cost: 15.9, quantity: 55, reorderLevel: 15, stockStatus: "in", velocity: "fast", expiry: null, updated: "2026-07-29" },
  { id: "p11", sku: "PWR-2230", name: "Reciprocating Saw", category: "Power Tools", supplier: "Ironclad Wholesale", price: 112.0, cost: 71.0, quantity: 5, reorderLevel: 10, stockStatus: "low", velocity: "fast", expiry: null, updated: "2026-07-31" },
  { id: "p12", sku: "HND-1090", name: "Tape Measure 25ft", category: "Hand Tools", supplier: "Summit Hardware Co.", price: 12.99, cost: 6.2, quantity: 88, reorderLevel: 20, stockStatus: "in", velocity: "fast", expiry: null, updated: "2026-07-26" },
];

export const mockCustomers = [
  { id: "cu1", name: "Denver Build Co.", email: "orders@denverbuild.com", phone: "+1 720 555 0111", totalOrders: 34, totalSpent: 18420.5, lastOrder: "2026-07-29" },
  { id: "cu2", name: "Harlow Renovations", email: "purchasing@harlow.com", phone: "+1 646 555 0199", totalOrders: 21, totalSpent: 9210.0, lastOrder: "2026-07-25" },
  { id: "cu3", name: "Union Electric LLC", email: "supply@unionelectric.com", phone: "+1 312 555 0122", totalOrders: 12, totalSpent: 5340.75, lastOrder: "2026-07-18" },
  { id: "cu4", name: "Riverside Contractors", email: "ap@riversidecon.com", phone: "+1 415 555 0166", totalOrders: 47, totalSpent: 26810.2, lastOrder: "2026-07-31" },
];

export const mockSales = [
  { id: "sl1", invoice: "INV-10245", customer: "Riverside Contractors", items: 6, total: 512.4, status: "Completed", date: "2026-07-31" },
  { id: "sl2", invoice: "INV-10244", customer: "Denver Build Co.", items: 3, total: 178.25, status: "Completed", date: "2026-07-31" },
  { id: "sl3", invoice: "INV-10243", customer: "Harlow Renovations", items: 9, total: 894.1, status: "Completed", date: "2026-07-30" },
  { id: "sl4", invoice: "INV-10242", customer: "Union Electric LLC", items: 2, total: 82.0, status: "Refunded", date: "2026-07-29" },
  { id: "sl5", invoice: "INV-10241", customer: "Riverside Contractors", items: 12, total: 1204.6, status: "Completed", date: "2026-07-28" },
];

export const mockPurchases = [
  { id: "pu1", po: "PO-5591", supplier: "Northgate Distribution", items: 40, total: 2160.0, status: "Received", date: "2026-07-30" },
  { id: "pu2", po: "PO-5590", supplier: "Ironclad Wholesale", items: 25, total: 1420.5, status: "Pending", date: "2026-07-29" },
  { id: "pu3", po: "PO-5589", supplier: "Pacific Fastener Supply", items: 200, total: 980.0, status: "Received", date: "2026-07-26" },
  { id: "pu4", po: "PO-5588", supplier: "Summit Hardware Co.", items: 60, total: 715.4, status: "Received", date: "2026-07-22" },
];

export const mockNotifications = [
  { id: "n1", type: "out", title: "Adjustable Wrench 10in is out of stock", time: "2h ago" },
  { id: "n2", type: "out", title: "12AWG Wire Spool 100ft is out of stock", time: "5h ago" },
  { id: "n3", type: "low", title: "Angle Grinder 4.5in below reorder level (8/12)", time: "6h ago" },
  { id: "n4", type: "low", title: "Nitrile Gloves (Box 100) below reorder level (6/25)", time: "8h ago" },
  { id: "n5", type: "expiry", title: "Nitrile Gloves (Box 100) expires in 14 days", time: "1d ago" },
  { id: "n6", type: "low", title: "Wall Anchor Kit below reorder level (18/20)", time: "1d ago" },
];

export const dashboardStats = {
  totalProducts: mockProducts.length + 143, // extended count beyond the visible sample rows
  totalCategories: mockCategories.length,
  totalSuppliers: mockSuppliers.length,
  totalSales: 1284,
  revenue: 184920.5,
  lowStock: mockProducts.filter((p) => p.stockStatus === "low").length + 6,
  outOfStock: mockProducts.filter((p) => p.stockStatus === "out").length + 2,
};

export const salesTrend = [
  { day: "Mon", sales: 4200, purchases: 2100 },
  { day: "Tue", sales: 3800, purchases: 1800 },
  { day: "Wed", sales: 5100, purchases: 2600 },
  { day: "Thu", sales: 4700, purchases: 2000 },
  { day: "Fri", sales: 6200, purchases: 3100 },
  { day: "Sat", sales: 5800, purchases: 2400 },
  { day: "Sun", sales: 3900, purchases: 1500 },
];

export const inventoryLevels = [
  { month: "Feb", level: 3200 },
  { month: "Mar", level: 3400 },
  { month: "Apr", level: 3100 },
  { month: "May", level: 3700 },
  { month: "Jun", level: 3550 },
  { month: "Jul", level: 3900 },
];

export const categoryDistribution = mockCategories.map((c) => ({
  name: c.name,
  value: c.productCount,
}));

export const recentActivity = [
  { id: "a1", type: "sale", text: "Sale INV-10245 recorded for Riverside Contractors", time: "12m ago" },
  { id: "a2", type: "purchase", text: "PO-5591 received from Northgate Distribution", time: "1h ago" },
  { id: "a3", type: "stock", text: "Angle Grinder 4.5in dropped below reorder level", time: "6h ago" },
  { id: "a4", type: "product", text: "New product added: Duplex Outlet (10 pack)", time: "9h ago" },
  { id: "a5", type: "customer", text: "New customer onboarded: Union Electric LLC", time: "1d ago" },
];

// AI-module mock output — real logic (moving-average velocity, reorder-point
// formula) gets implemented in the AI module; this is the shape it will return.
export const aiInsights = {
  predictedLowStock: [
    { product: "Angle Grinder 4.5in", daysUntilStockout: 4, confidence: 0.91 },
    { product: "Nitrile Gloves (Box 100)", daysUntilStockout: 2, confidence: 0.95 },
    { product: "Wall Anchor Kit", daysUntilStockout: 9, confidence: 0.78 },
    { product: "Reciprocating Saw", daysUntilStockout: 6, confidence: 0.83 },
  ],
  reorderRecommendations: [
    { product: "Adjustable Wrench 10in", suggestedQty: 60, reason: "Out of stock, fast-moving" },
    { product: "12AWG Wire Spool 100ft", suggestedQty: 25, reason: "Out of stock, steady demand" },
    { product: "Angle Grinder 4.5in", suggestedQty: 30, reason: "Approaching stockout in 4 days" },
  ],
  fastMoving: ["18V Cordless Drill", "Safety Goggles (Clear)", "Duplex Outlet (10 pack)", "Adjustable Wrench 10in"],
  slowMoving: ["M8 Hex Bolt (Pack 200)", "Claw Hammer 16oz", "Wall Anchor Kit"],
};

export const aiChatCannedResponses = [
  {
    match: ["low stock", "low-stock", "reorder"],
    reply:
      "4 products are trending toward a stockout this week: Nitrile Gloves (2 days), Angle Grinder (4 days), Reciprocating Saw (6 days), and Wall Anchor Kit (9 days). Want reorder quantity suggestions?",
  },
  {
    match: ["fast", "moving", "best seller", "bestseller"],
    reply:
      "Your fastest-moving items right now are the 18V Cordless Drill, Safety Goggles, and Duplex Outlet 10-pack — all selling faster than their restock rate.",
  },
  {
    match: ["revenue", "sales"],
    reply:
      "This week's revenue is trending up 12% over last week, led by Power Tools. Riverside Contractors is your top buyer this month.",
  },
  {
    match: ["out of stock", "out-of-stock"],
    reply:
      "Adjustable Wrench 10in and 12AWG Wire Spool are currently out of stock. Both are flagged for reorder — 60 units and 25 units respectively.",
  },
];
