-- ========================================================================
-- STOCKPILOT — SUPABASE / POSTGRESQL COMPLETE SCHEMA & SEED DATA
-- Run this in Supabase SQL Editor: Dashboard -> SQL Editor -> New Query -> Run
-- ========================================================================

-- ------------------------------------------------------------------------
-- STEP 1: CREATE TABLES
-- ------------------------------------------------------------------------

-- 1. Users
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Staff',
    avatar_color VARCHAR(50)
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

-- 3. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    rating NUMERIC(3, 2) DEFAULT 0.0
);

-- 4. Products
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(255) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) REFERENCES public.categories(id) ON DELETE SET NULL,
    supplier_id VARCHAR(255) REFERENCES public.suppliers(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    safety_stock INTEGER NOT NULL DEFAULT 5,
    expiry_date TIMESTAMPTZ NULL
);

-- 5. Inventory Transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) REFERENCES public.products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- stock-in, stock-out, transfer, adjustment
    quantity_change INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 6. Orders (Sales)
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(255) PRIMARY KEY,
    invoice VARCHAR(100) UNIQUE NOT NULL,
    customer VARCHAR(255) NOT NULL,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL, -- Completed, Refunded, Pending
    date TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id VARCHAR(255) REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- 8. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id VARCHAR(255) PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id VARCHAR(255) REFERENCES public.suppliers(id) ON DELETE SET NULL,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL, -- Pending, Received, Approved
    date TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id VARCHAR(255) PRIMARY KEY,
    po_id VARCHAR(255) REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(255) REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- 10. Production Batches
CREATE TABLE IF NOT EXISTS public.production_batches (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) REFERENCES public.products(id) ON DELETE SET NULL,
    output_quantity INTEGER NOT NULL,
    defect_rate NUMERIC(5, 2) DEFAULT 0.0,
    downtime_minutes INTEGER DEFAULT 0,
    date TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    last_order_date TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT
);

-- 13. Locations
CREATE TABLE IF NOT EXISTS public.locations (
    id VARCHAR(255) PRIMARY KEY,
    warehouse_id VARCHAR(255) REFERENCES public.warehouses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'internal' -- internal, vendor, customer, loss
);

-- 14. Stock Quants
CREATE TABLE IF NOT EXISTS public.stock_quants (
    id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) REFERENCES public.products(id) ON DELETE CASCADE,
    location_id VARCHAR(255) REFERENCES public.locations(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    lot_number VARCHAR(100) NULL
);

-- ------------------------------------------------------------------------
-- STEP 2: PERFORMANCE INDEXES
-- ------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_invoice ON public.orders(invoice);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_po_number ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_locations_wh ON public.locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_quants_prod_loc ON public.stock_quants(product_id, location_id);

-- ------------------------------------------------------------------------
-- STEP 3: ROW LEVEL SECURITY (RLS) POLICIES
-- Allows full access to anon / authenticated client / backend connections
-- ------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_quants ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'users', 'categories', 'suppliers', 'products',
            'inventory_transactions', 'orders', 'order_items',
            'purchase_orders', 'purchase_order_items', 'production_batches',
            'customers', 'warehouses', 'locations', 'stock_quants'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public all access" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow public all access" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------
-- STEP 4: SEED INITIAL DATA
-- ------------------------------------------------------------------------

-- Users (Password for all 3 demo accounts is: password123)
INSERT INTO public.users (id, name, email, hashed_password, role, avatar_color) VALUES
('u1', 'Ava Whitfield', 'admin@stockpilot.io', '$2b$12$hdH.dJ0HSOL4gnRgwU/1VuXZgHIIwVsNWatWlpm3D4z/q131fFLn6', 'Admin', '#F5C518'),
('u2', 'Marcus Reyes', 'manager@stockpilot.io', '$2b$12$hdH.dJ0HSOL4gnRgwU/1VuXZgHIIwVsNWatWlpm3D4z/q131fFLn6', 'Manager', '#4C8DFF'),
('u3', 'Priya Nair', 'employee@stockpilot.io', '$2b$12$hdH.dJ0HSOL4gnRgwU/1VuXZgHIIwVsNWatWlpm3D4z/q131fFLn6', 'Employee', '#33C481')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO public.categories (id, name, description) VALUES
('c1', 'Power Tools', 'Cordless & corded power equipment'),
('c2', 'Hand Tools', 'Wrenches, hammers, screwdrivers'),
('c3', 'Safety Gear', 'PPE and protective equipment'),
('c4', 'Fasteners', 'Bolts, screws, anchors'),
('c5', 'Electrical', 'Wiring, conduit, switches')
ON CONFLICT (id) DO NOTHING;

-- Suppliers
INSERT INTO public.suppliers (id, name, contact, email, phone, rating) VALUES
('s1', 'Northgate Distribution', 'Lena Ford', 'lena@northgate.co', '+1 415 555 0132', 4.6),
('s2', 'Ironclad Wholesale', 'Diego Marin', 'diego@ironclad.co', '+1 312 555 0187', 4.2),
('s3', 'Summit Hardware Co.', 'Rachel Kim', 'rachel@summithw.com', '+1 206 555 0144', 4.8),
('s4', 'Pacific Fastener Supply', 'Omar Haddad', 'omar@pacfast.com', '+1 503 555 0199', 4.4)
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO public.products (id, sku, name, category_id, supplier_id, price, cost, quantity, reorder_level, safety_stock, expiry_date) VALUES
('p1', 'PWR-2201', '18V Cordless Drill', 'c1', 's1', 89.99, 54.00, 42, 15, 5, NULL),
('p2', 'PWR-2214', 'Angle Grinder 4.5in', 'c1', 's1', 64.50, 38.20, 8, 12, 5, NULL),
('p3', 'HND-1042', 'Claw Hammer 16oz', 'c2', 's3', 18.75, 9.40, 130, 30, 10, NULL),
('p4', 'HND-1077', 'Adjustable Wrench 10in', 'c2', 's3', 22.00, 11.50, 0, 20, 5, NULL),
('p5', 'SFT-3305', 'Safety Goggles (Clear)', 'c3', 's2', 6.50, 2.80, 210, 50, 15, '2027-03-01 00:00:00+00'),
('p6', 'SFT-3320', 'Nitrile Gloves (Box 100)', 'c3', 's2', 14.25, 8.10, 6, 25, 10, '2026-08-15 00:00:00+00'),
('p7', 'FST-5510', 'M8 Hex Bolt (Pack 200)', 'c4', 's4', 11.00, 5.40, 340, 60, 20, NULL),
('p8', 'FST-5522', 'Wall Anchor Kit', 'c4', 's4', 9.40, 4.60, 18, 20, 5, NULL),
('p9', 'ELC-7701', '12AWG Wire Spool 100ft', 'c5', 's1', 41.00, 26.00, 0, 10, 3, NULL),
('p10', 'ELC-7715', 'Duplex Outlet (10 pack)', 'c5', 's2', 27.50, 15.90, 55, 15, 5, NULL),
('p11', 'PWR-2230', 'Reciprocating Saw', 'c1', 's2', 112.00, 71.00, 5, 10, 3, NULL),
('p12', 'HND-1090', 'Tape Measure 25ft', 'c2', 's3', 12.99, 6.20, 88, 20, 5, NULL)
ON CONFLICT (id) DO NOTHING;

-- Orders
INSERT INTO public.orders (id, invoice, customer, total, status, date) VALUES
('sl1', 'INV-10245', 'Riverside Contractors', 512.40, 'Completed', '2026-07-31 00:00:00+00'),
('sl2', 'INV-10244', 'Denver Build Co.', 178.25, 'Completed', '2026-07-31 00:00:00+00'),
('sl3', 'INV-10243', 'Harlow Renovations', 894.10, 'Completed', '2026-07-30 00:00:00+00'),
('sl4', 'INV-10242', 'Union Electric LLC', 82.00, 'Refunded', '2026-07-29 00:00:00+00'),
('sl5', 'INV-10241', 'Riverside Contractors', 1204.60, 'Completed', '2026-07-28 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Order Items
INSERT INTO public.order_items (id, order_id, product_id, quantity, price) VALUES
('oi1', 'sl1', 'p1', 4, 89.99),
('oi2', 'sl1', 'p2', 2, 64.50),
('oi3', 'sl2', 'p3', 5, 18.75),
('oi4', 'sl3', 'p10', 10, 27.50),
('oi5', 'sl5', 'p11', 6, 112.00)
ON CONFLICT (id) DO NOTHING;

-- Purchase Orders
INSERT INTO public.purchase_orders (id, po_number, supplier_id, total, status, date) VALUES
('pu1', 'PO-5591', 's1', 2160.00, 'Received', '2026-07-30 00:00:00+00'),
('pu2', 'PO-5590', 's2', 1420.50, 'Pending', '2026-07-29 00:00:00+00'),
('pu3', 'PO-5589', 's4', 980.00, 'Received', '2026-07-26 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Purchase Order Items
INSERT INTO public.purchase_order_items (id, po_id, product_id, quantity, cost) VALUES
('poi1', 'pu1', 'p1', 40, 54.00),
('poi2', 'pu2', 'p2', 25, 38.20),
('poi3', 'pu3', 'p7', 200, 5.40)
ON CONFLICT (id) DO NOTHING;

-- Inventory Transactions
INSERT INTO public.inventory_transactions (id, product_id, type, quantity_change, timestamp, notes) VALUES
('tx1', 'p1', 'stock-in', 40, '2026-07-30 00:00:00+00', 'PO-5591 Received'),
('tx2', 'p1', 'stock-out', -4, '2026-07-31 00:00:00+00', 'Order INV-10245'),
('tx3', 'p2', 'stock-out', -2, '2026-07-31 00:00:00+00', 'Order INV-10245')
ON CONFLICT (id) DO NOTHING;

-- Customers
INSERT INTO public.customers (id, name, email, phone, total_orders, total_spent, last_order_date, created_at) VALUES
('cu1', 'Denver Build Co.', 'orders@denverbuild.com', '+1 720 555 0111', 34, 18420.50, '2026-07-29 00:00:00+00', NOW()),
('cu2', 'Harlow Renovations', 'purchasing@harlow.com', '+1 646 555 0199', 21, 9210.00, '2026-07-25 00:00:00+00', NOW()),
('cu3', 'Union Electric LLC', 'supply@unionelectric.com', '+1 312 555 0122', 12, 5340.75, '2026-07-18 00:00:00+00', NOW()),
('cu4', 'Riverside Contractors', 'ap@riversidecon.com', '+1 415 555 0166', 47, 26810.20, '2026-07-31 00:00:00+00', NOW())
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO public.warehouses (id, name, code, address) VALUES
('wh1', 'Central Distribution Hub', 'WH-CENTRAL', '1000 Industrial Parkway, Denver, CO'),
('wh2', 'Pacific Coast Depot', 'WH-PACIFIC', '450 Harbor Way, Seattle, WA')
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO public.locations (id, warehouse_id, name, type) VALUES
('loc1', 'wh1', 'Aisle 1 / Shelf A', 'internal'),
('loc2', 'wh1', 'Aisle 2 / Shelf B', 'internal'),
('loc3', 'wh1', 'Receiving Bay', 'internal'),
('loc4', 'wh1', 'Scrap / Spoilage', 'loss'),
('loc5', 'wh2', 'Main Stock Bay', 'internal')
ON CONFLICT (id) DO NOTHING;

-- Stock Quants
INSERT INTO public.stock_quants (id, product_id, location_id, quantity, lot_number) VALUES
('sq1', 'p1', 'loc1', 30, 'LOT-2026-A1'),
('sq2', 'p1', 'loc5', 12, 'LOT-2026-A2'),
('sq3', 'p2', 'loc2', 8, 'LOT-2026-B1')
ON CONFLICT (id) DO NOTHING;
