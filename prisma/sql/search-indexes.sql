-- Fast ILIKE '%term%' product search (Prisma cannot express GIN/trigram indexes in the schema).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Product_description_trgm_idx" ON "Product" USING gin ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ProductVariant_sku_trgm_idx" ON "ProductVariant" USING gin ("sku" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Order_customerName_trgm_idx" ON "Order" USING gin ("customerName" gin_trgm_ops);
-- Low-stock report: partial index on the rows that matter.
CREATE INDEX IF NOT EXISTS "Inventory_low_stock_idx" ON "Inventory" ("quantity") WHERE "quantity" <= 5;
