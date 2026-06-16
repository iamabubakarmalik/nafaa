#!/usr/bin/env python3
"""
HM Carpets — Bulk Seed Script
Safely adds missing products + variants to production DB.
Re-runnable: skips products that already exist by SKU.
"""
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL not set. Run: export DATABASE_URL=\"...\"")
    sys.exit(1)

# ─── Constants from your DB ──────────────────────────────────────────
TENANT_ID = "6ada2091-8717-4b2e-9939-b28d5dcd3220"
BRAND_ID = "97220beb-15a2-458e-be07-ffef1f53a52e"  # Sun Fibre
CAT_CARPETS = "519a74e1-20d0-429d-8b2b-8f10de2eee0d"
CAT_ECONOMY = "14c8bc35-cf02-4547-9f4e-6313398ff3b5"
CAT_PREMIUM = "79bef10b-0f31-47f9-8726-f91ba74e3ed3"

# ─── Tag IDs ─────────────────────────────────────────────────────────
TAGS = {
    "Best Seller": "f9cb191f-779a-4811-a56a-41bcb106df23",
    "Bold": "3eacca09-4e09-41b4-9fd7-14dc2f9e02ac",
    "Decorative": "406da05c-49f9-4490-a067-eef6adef1975",
    "Designer Mat": "8c83e2b5-3399-4c95-942d-1e4b828e9d6d",
    "Diamond Pattern": "bf681128-4421-47a0-8b82-a3dc7af99777",
    "Digital Print": "980e1180-afc3-41fe-9868-29c2496a024f",
    "Distressed": "614328ad-f198-4365-a832-939ab7ae8f8e",
    "Featured": "edd2e382-4359-40d2-a3ad-1698fad73989",
    "Floral Design": "5aa1ef1b-5f53-4842-83d5-afbb5c5ecae9",
    "Geometric Design": "a36db524-16f9-43bc-9b71-d554384e09e1",
    "Geometric Floral": "822bb854-7dc6-4c18-96d2-5fba2a82424c",
    "Hexagonal Pattern": "95ad4e25-a827-4eeb-bf46-54ef6ac6ee64",
    "Islamic": "e7393a44-84a3-4343-a466-971abcbfec3f",
    "Lattice Design": "0ef46024-d6fc-4f94-8841-aec5b6055354",
    "Luxury": "0ce017a1-b272-4962-adbb-86846dd811e3",
    "Mandala Design": "b6e016b7-b449-4f71-a3c4-017116b27697",
    "Medallion Design": "285403bf-fac4-4dd4-9c4a-d395cc5ca855",
    "Modern": "51be3bc2-1f21-44c3-acb8-47d2c358a2fe",
    "New Arrival": "e885e1c3-65dd-4e1e-b7c9-12fe53727da7",
    "Oriental Design": "3e6207d3-619a-4daf-86bb-8eb00db8e933",
    "Patchwork": "cc3f091c-56cf-42cc-b3df-04acbb259b27",
    "Persian Style": "47068c4c-8eb6-4999-a9f9-ca6a6823f327",
    "Plaid Design": "33d2c332-e2c8-40d9-8046-de4c39d665e5",
    "Premium": "a42613d5-b81e-4bcf-8045-b6ccef738039",
    "Scroll Design": "cd6a47e4-d86e-46c3-b404-fd36ee239aae",
}

# ─── DB Connection ───────────────────────────────────────────────────
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = False
cur = conn.cursor(cursor_factory=RealDictCursor)

stats = {"products_added": 0, "products_skipped": 0, "variants_added": 0, "tags_linked": 0}

def get_or_create_tag(name, color="#64748b"):
    """Get tag ID by name, create if missing."""
    if name in TAGS:
        return TAGS[name]
    cur.execute(
        'SELECT id FROM "Tag" WHERE "tenantId" = %s AND name = %s',
        (TENANT_ID, name)
    )
    row = cur.fetchone()
    if row:
        TAGS[name] = row["id"]
        return row["id"]
    new_id = str(uuid.uuid4())
    cur.execute(
        'INSERT INTO "Tag" (id, "tenantId", name, color, "createdAt", "updatedAt") VALUES (%s, %s, %s, %s, NOW(), NOW())',
        (new_id, TENANT_ID, name, color)
    )
    TAGS[name] = new_id
    print(f"  + Tag created: {name}")
    return new_id

def product_exists(sku):
    cur.execute(
        'SELECT id FROM "Product" WHERE "tenantId" = %s AND sku = %s',
        (TENANT_ID, sku)
    )
    return cur.fetchone()

def add_product(prod):
    """Add product + variants + tags. Skip if SKU already exists."""
    existing = product_exists(prod["sku"])
    if existing:
        print(f"  ⏭  SKIP (exists): {prod['name']} [{prod['sku']}]")
        stats["products_skipped"] += 1
        return existing["id"]

    pid = str(uuid.uuid4())
    cur.execute("""
        INSERT INTO "Product" (
            id, "tenantId", "categoryId", "brandId", name, "shortDescription", description,
            sku, unit, price, "costPrice", "wholesalePrice", "taxRate",
            stock, "lowStockAlert", weight, "weightUnit",
            "isActive", "isFeatured", "hasVariants", "expiryTracked",
            "createdAt", "updatedAt"
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            NOW(), NOW()
        )
    """, (
        pid, TENANT_ID, prod.get("category_id", CAT_CARPETS), BRAND_ID,
        prod["name"], prod.get("short_desc", ""), prod.get("full_desc", ""),
        prod["sku"], prod.get("unit", "sqft"),
        prod["price"], prod["cost"], prod.get("wholesale"), 0,
        0, 50, prod.get("weight", 2800), "gram",
        True, prod.get("featured", False), True, False,
    ))
    stats["products_added"] += 1
    print(f"  ✅ Product: {prod['name']} [{prod['sku']}]")

    # Add variants
    for idx, v in enumerate(prod["variants"], start=1):
        vid = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO "ProductVariant" (
                id, "productId", name, sku, barcode,
                color, "colorHex", size, price, "costPrice", "wholesalePrice",
                stock, "lowStockAlert", unit, "isActive", "sortOrder",
                "createdAt", "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                NOW(), NOW()
            )
        """, (
            vid, pid,
            f"{prod['name']} {v['code']} — {v['color_name']}",
            f"{prod['sku']}-{v['code']}",
            v.get("barcode"),
            v["color_name"], v["color_hex"], v["code"],
            prod["price"], prod["cost"], prod.get("wholesale"),
            0, 50, prod.get("unit", "sqft"), True, idx,
        ))
        stats["variants_added"] += 1

    # Link tags
    for tag_name in prod.get("tags", []):
        tag_id = get_or_create_tag(tag_name)
        cur.execute("""
            INSERT INTO "ProductTag" ("productId", "tagId", "createdAt")
            VALUES (%s, %s, NOW())
            ON CONFLICT DO NOTHING
        """, (pid, tag_id))
        stats["tags_linked"] += 1

    return pid

# ─── Color helpers ──────────────────────────────────────────────────
def v(code, name, hex_):
    return {"code": code, "color_name": name, "color_hex": hex_}


# ─── Main Execution ──────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        from products_data import PRODUCTS
    except ImportError:
        print("❌ products_data.py not found in same folder")
        sys.exit(1)

    print(f"\n🚀 HM Carpets Seed Script")
    print(f"   Tenant: {TENANT_ID}")
    print(f"   Products to process: {len(PRODUCTS)}")
    print(f"   {'─' * 60}\n")

    try:
        for prod in PRODUCTS:
            add_product(prod)
        conn.commit()
        print(f"\n{'═' * 60}")
        print(f"✅ SUCCESS — All changes committed")
        print(f"   Products added:   {stats['products_added']}")
        print(f"   Products skipped: {stats['products_skipped']}")
        print(f"   Variants added:   {stats['variants_added']}")
        print(f"   Tags linked:      {stats['tags_linked']}")
        print(f"{'═' * 60}\n")
    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR — Rolled back all changes")
        print(f"   {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()
