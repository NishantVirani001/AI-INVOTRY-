from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Staff") # Admin, Manager, Staff
    avatar_color = Column(String)

class Category(Base):
    __tablename__ = "categories"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    products = relationship("Product", back_populates="category_obj")

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    contact = Column(String)
    email = Column(String)
    phone = Column(String)
    rating = Column(Float)
    products = relationship("Product", back_populates="supplier_obj")

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    category_id = Column(String, ForeignKey("categories.id"), index=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), index=True)
    price = Column(Float)
    cost = Column(Float)
    quantity = Column(Integer, default=0, index=True)
    reorder_level = Column(Integer, default=10)
    safety_stock = Column(Integer, default=5)
    expiry_date = Column(DateTime, nullable=True, index=True)
    
    category_obj = relationship("Category", back_populates="products")
    supplier_obj = relationship("Supplier", back_populates="products")
    transactions = relationship("InventoryTransaction", back_populates="product")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"), index=True)
    type = Column(String) # stock-in, stock-out, transfer, adjustment
    quantity_change = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(String, nullable=True)
    
    product = relationship("Product", back_populates="transactions")

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, index=True)
    invoice = Column(String, unique=True, index=True)
    customer = Column(String, index=True)
    total = Column(Float)
    status = Column(String, index=True) # Completed, Refunded
    date = Column(DateTime, default=datetime.utcnow, index=True)
    
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(String, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"), index=True)
    product_id = Column(String, ForeignKey("products.id"), index=True)
    quantity = Column(Integer)
    price = Column(Float)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True, index=True)
    po_number = Column(String, unique=True, index=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), index=True)
    total = Column(Float)
    status = Column(String, index=True) # Pending, Received, Approved
    date = Column(DateTime, default=datetime.utcnow, index=True)
    
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")
    supplier = relationship("Supplier")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(String, primary_key=True, index=True)
    po_id = Column(String, ForeignKey("purchase_orders.id"), index=True)
    product_id = Column(String, ForeignKey("products.id"), index=True)
    quantity = Column(Integer)
    cost = Column(Float)
    
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")

class ProductionBatch(Base):
    __tablename__ = "production_batches"
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"))
    output_quantity = Column(Integer)
    defect_rate = Column(Float) # percentage
    downtime_minutes = Column(Integer)
    date = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product")

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    last_order_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)
    address = Column(String, nullable=True)
    
    locations = relationship("Location", back_populates="warehouse")

class Location(Base):
    __tablename__ = "locations"
    id = Column(String, primary_key=True, index=True)
    warehouse_id = Column(String, ForeignKey("warehouses.id"))
    name = Column(String, index=True)
    type = Column(String, default="internal") # internal, vendor, customer, loss
    
    warehouse = relationship("Warehouse", back_populates="locations")
    quants = relationship("StockQuant", back_populates="location")

class StockQuant(Base):
    __tablename__ = "stock_quants"
    id = Column(String, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("products.id"))
    location_id = Column(String, ForeignKey("locations.id"))
    quantity = Column(Integer, default=0)
    lot_number = Column(String, nullable=True)
    
    product = relationship("Product")
    location = relationship("Location", back_populates="quants")

