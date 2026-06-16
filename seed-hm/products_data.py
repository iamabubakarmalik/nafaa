"""
HM Carpets — All missing products data
Phase 4 (9 designs), Phase 5 (20), Phase 6 (29) = 58 products
"""

def v(code, name, hex_):
    return {"code": code, "color_name": name, "color_hex": hex_}

# Common 8-color Flora palette
P_FLORA = [
    v("1D", "Brick Red", "#b91c1c"),
    v("4A", "Forest Green", "#15803d"),
    v("5", "Royal Blue", "#1d4ed8"),
    v("6", "Beige", "#d4a574"),
    v("7", "Dark Brown", "#5c3317"),
    v("9", "Grey", "#64748b"),
    v("10D", "Camel", "#c08552"),
    v("17", "Mustard", "#ca8a04"),
]

# Digital Print common pricing
DP_PRICE = {"price": 53, "cost": 41, "wholesale": 46}

# 6-color Faras palette
P_FARAS_6A = [
    v("0", "Navy Blue", "#1e3a8a"),
    v("2", "Terracotta", "#c2410c"),
    v("4", "Gold Tan", "#ca8a04"),
    v("5", "Slate Blue", "#475569"),
    v("6", "Crimson Red", "#991b1b"),
    v("12", "Taupe Brown", "#78716c"),
]

PRODUCTS = []

# ═══════════════════════════════════════════════════════════════════
# PHASE 4 — 9 designs (Sun-432 already added, skip)
# ═══════════════════════════════════════════════════════════════════

PRODUCTS.append({
    "name": "Sun-433",
    "sku": "SUN-433",
    "short_desc": "Diamond plaid patchwork carpet with floral motifs — digital print, 6 colors",
    "full_desc": "Sun Fibre Sun-433 series — premium digitally printed carpet featuring diamond plaid patchwork pattern with floral motifs and geometric lattice. Perfect for drawing rooms, bedrooms, and elegant interiors. Pakistan-made premium quality.",
    "unit": "sqft", "featured": True,
    **DP_PRICE,
    "tags": ["Diamond Pattern", "Plaid Design", "Floral Design", "Digital Print", "Premium", "Patchwork"],
    "variants": [
        v("2", "Peach Tan", "#fed7aa"),
        v("4", "Gold Tan Brown", "#a16207"),
        v("5", "Blue Grey Navy", "#1e3a8a"),
        v("6", "Vibrant Red Burgundy", "#b91c1c"),
        v("12", "Tan Brown Cream", "#92400e"),
        v("16", "Sage Green Teal", "#0f766e"),
    ],
})

PRODUCTS.append({
    "name": "Faras-60",
    "sku": "FARAS-60",
    "short_desc": "Square tile floral bouquet carpet — digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-60 series — beautiful digitally printed carpet featuring square tile pattern with central floral bouquets surrounded by circular flower rosette motifs. Classical decorative aesthetic perfect for drawing rooms and traditional Pakistani interiors.",
    "unit": "sqft", "featured": False,
    **DP_PRICE,
    "tags": ["Floral Design", "Geometric Floral", "Digital Print", "Premium", "Decorative"],
    "variants": [
        v("0", "Dark Navy", "#1e3a8a"),
        v("2", "Copper Orange", "#c2410c"),
        v("4", "Yellow Brown", "#a16207"),
        v("5", "Navy Blue", "#1d4ed8"),
        v("6", "Deep Red", "#991b1b"),
        v("12", "Taupe Brown", "#92400e"),
    ],
})

PRODUCTS.append({
    "name": "Faras-61",
    "sku": "FARAS-61",
    "short_desc": "Star lattice floral sprig carpet — digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-61 series — premium carpet featuring geometric star-shaped lattice pattern containing colorful floral sprigs. Beautiful blend of structured geometry and natural floral charm. Pakistan-made premium quality.",
    "unit": "sqft", "featured": False,
    **DP_PRICE,
    "tags": ["Lattice Design", "Floral Design", "Digital Print", "Premium", "Geometric Floral"],
    "variants": [
        v("0", "Light Blue", "#1d4ed8"),
        v("2", "Brown Rust", "#92400e"),
        v("4", "Tan Lavender", "#a87b56"),
        v("5", "Dark Blue Teal", "#1e3a8a"),
        v("6", "Burgundy Red", "#991b1b"),
        v("12", "Beige Tan", "#fde68a"),
    ],
})

PRODUCTS.append({
    "name": "Sun-431",
    "sku": "SUN-431",
    "short_desc": "Diamond lattice circular wreath carpet — digital print, 6 colors",
    "full_desc": "Sun Fibre Sun-431 series — elegant carpet featuring diagonal diamond lattice grid with circular floral wreath motifs at each intersection. Sophisticated traditional design perfect for drawing rooms and classical interiors.",
    "unit": "sqft", "featured": False,
    **DP_PRICE,
    "tags": ["Diamond Pattern", "Lattice Design", "Floral Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Dark Navy", "#1e3a8a"),
        v("2", "Copper Orange", "#c2410c"),
        v("4", "Gold Yellow", "#ca8a04"),
        v("5", "Medium Blue", "#1d4ed8"),
        v("6", "Red Burgundy", "#b91c1c"),
        v("12", "Light Beige", "#d4a574"),
    ],
})

PRODUCTS.append({
    "name": "Faras-63",
    "sku": "FARAS-63",
    "short_desc": "Persian patchwork composition carpet — premium digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-63 series — luxurious carpet featuring rich patchwork-style composition with Persian motifs, floral sprays, and marble effects. Museum-quality appearance perfect for premium drawing rooms and luxury majlis.",
    "unit": "sqft", "featured": True,
    **DP_PRICE,
    "tags": ["Persian Style", "Patchwork", "Floral Design", "Digital Print", "Premium", "Luxury", "Oriental Design"],
    "variants": [
        v("2", "Peach Tan", "#fed7aa"),
        v("4", "Cream Beige", "#fde68a"),
        v("5", "Denim Blue", "#1d4ed8"),
        v("6", "Crimson Red", "#991b1b"),
        v("12", "Taupe Brown", "#78716c"),
        v("16", "Sage Green", "#0f766e"),
    ],
})

PRODUCTS.append({
    "name": "Faras-64",
    "sku": "FARAS-64",
    "short_desc": "Modern hexagonal chain pattern carpet — contemporary digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-64 series — modern contemporary carpet featuring interlocking hexagonal outline chains overlaid on textured background. Trendy geometric design perfect for modern apartments and contemporary interiors.",
    "unit": "sqft", "featured": True,
    **DP_PRICE,
    "tags": ["Hexagonal Pattern", "Geometric Design", "Digital Print", "Premium", "Modern", "Distressed", "New Arrival"],
    "variants": [
        v("0", "Indigo Navy", "#1e3a8a"),
        v("2", "Terracotta Rust", "#c2410c"),
        v("4", "Cream Golden", "#ca8a04"),
        v("5", "Denim Blue", "#3b82f6"),
        v("6", "Crimson Red", "#dc2626"),
        v("12", "Taupe Grey", "#78716c"),
    ],
})

PRODUCTS.append({
    "name": "Faras-62",
    "sku": "FARAS-62",
    "short_desc": "Mandala medallion grid carpet — ornate Oriental print, 6 colors",
    "full_desc": "Sun Fibre Faras-62 series — luxurious carpet featuring grid-like patchwork of ornate circular mandalas surrounded by traditional Oriental borders. Islamic-inspired geometric artistry perfect for mosques, madrassas, and Islamic interior spaces.",
    "unit": "sqft", "featured": True,
    **DP_PRICE,
    "tags": ["Mandala Design", "Medallion Design", "Oriental Design", "Digital Print", "Premium", "Islamic"],
    "variants": [
        v("0", "Navy Blue", "#1e3a8a"),
        v("2", "Warm Tan", "#a16207"),
        v("4", "Cream Tan", "#fde68a"),
        v("5", "Teal Blue", "#0f766e"),
        v("6", "Ruby Red", "#991b1b"),
        v("12", "Light Brown", "#92400e"),
    ],
})

PRODUCTS.append({
    "name": "Faras-66",
    "sku": "FARAS-66",
    "short_desc": "Diagonal triangle floral vine carpet — unique digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-66 series — uniquely designed carpet featuring diagonal split-square triangle patches filled with delicate floral vine patterns. Innovative geometric layout perfect for modern drawing rooms and designer interiors.",
    "unit": "sqft", "featured": False,
    **DP_PRICE,
    "tags": ["Floral Design", "Digital Print", "Premium", "Modern", "Geometric Design"],
    "variants": [
        v("2", "Rust Red", "#c2410c"),
        v("3", "Terracotta", "#dc2626"),
        v("4", "Brown Taupe", "#78350f"),
        v("5", "Navy Blue", "#1e3a8a"),
        v("6", "Crimson Red", "#991b1b"),
        v("12", "Light Sand", "#d4a574"),
    ],
})

PRODUCTS.append({
    "name": "Faras-65",
    "sku": "FARAS-65",
    "short_desc": "Baroque patchwork carpet with framed medallions — premium digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-65 series — luxurious carpet featuring structured patchwork grid with framed floral medallions and ornate baroque-style bouquets. Regal palatial appearance perfect for luxury drawing rooms and statement interiors.",
    "unit": "sqft", "featured": True,
    **DP_PRICE,
    "tags": ["Patchwork", "Medallion Design", "Floral Design", "Digital Print", "Premium", "Luxury"],
    "variants": [
        v("2", "Salmon Peach", "#fed7aa"),
        v("4", "Warm Gold", "#ca8a04"),
        v("5", "Deep Blue Teal", "#1e3a8a"),
        v("6", "Ruby Red", "#991b1b"),
        v("12", "Taupe Brown", "#78716c"),
        v("16", "Sage Green", "#0f766e"),
    ],
})

print(f"📦 Phase 4 loaded: {len(PRODUCTS)} products")

# ═══════════════════════════════════════════════════════════════════
# PHASE 5 — 20 Digital Print Designs
# ═══════════════════════════════════════════════════════════════════

PRODUCTS.append({
    "name": "Sun-429", "sku": "SUN-429",
    "short_desc": "Stylized sunburst floral runner — digital print, 6 colors",
    "full_desc": "Sun Fibre Sun-429 series — vibrant carpet with large stylized sunburst floral motifs arranged in color-blocked grid. Perfect for runners, hallways, drawing rooms.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Floral Design", "Digital Print", "Premium", "Decorative"],
    "variants": [
        v("0", "Dark Navy Blue", "#1e3a8a"),
        v("2", "Rust Brown", "#92400e"),
        v("4", "Tan Beige", "#d4a574"),
        v("5", "Slate Blue", "#475569"),
        v("6", "Burgundy Red", "#991b1b"),
        v("12", "Light Taupe Brown", "#a87b56"),
    ],
})

PRODUCTS.append({
    "name": "Faras-45", "sku": "FARAS-45",
    "short_desc": "Patchwork mandala oriental carpet — digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-45 series — classic patchwork design with rectangular blocks containing Persian borders and circular mandalas.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Mandala Design", "Patchwork", "Oriental Design", "Digital Print", "Premium", "Persian Style"],
    "variants": [
        v("0", "Charcoal Dark Grey", "#374151"),
        v("2", "Terracotta Rust", "#92400e"),
        v("4", "Warm Beige Brown", "#a87b56"),
        v("5", "Slate Grey Blue", "#475569"),
        v("6", "Ruby Red", "#991b1b"),
        v("12", "Soft Grey Taupe", "#78716c"),
    ],
})

PRODUCTS.append({
    "name": "Sun-424", "sku": "SUN-424",
    "short_desc": "Floral lattice baroque carpet — undulating design, 6 colors",
    "full_desc": "Sun Fibre Sun-424 series — sophisticated classical carpet framed with flowing white undulating lattice and floral bouquets.",
    "unit": "sqft", "featured": False, **DP_PRICE,
    "tags": ["Floral Design", "Lattice Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Navy Blue", "#1e3a8a"),
        v("2", "Warm Orange Terracotta", "#c2410c"),
        v("4", "Light Gold Beige", "#ca8a04"),
        v("5", "Steel Blue", "#475569"),
        v("6", "Crimson Red", "#b91c1c"),
        v("12", "Soft Taupe Beige", "#a87b56"),
    ],
})

PRODUCTS.append({
    "name": "Faras-55", "sku": "FARAS-55",
    "short_desc": "Interlocking geometric star lattice carpet — digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-55 series — modern geometric carpet with overlapping grid network forming star structures.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Geometric Design", "Lattice Design", "Digital Print", "Premium", "Modern"],
    "variants": [
        v("0", "Navy Blue Cream", "#1e3a8a"),
        v("2", "Rust Orange Cream", "#c2410c"),
        v("4", "Cream Gold", "#ca8a04"),
        v("5", "Light Blue Cream", "#3b82f6"),
        v("6", "Deep Red Cream", "#991b1b"),
        v("12", "Taupe Cream", "#a87b56"),
    ],
})

PRODUCTS.append({
    "name": "Faras-48", "sku": "FARAS-48",
    "short_desc": "Islamic star trellis carpet — digital print, 6 colors",
    "full_desc": "Sun Fibre Faras-48 series — elegant geometric lattice with eight-pointed star frameworks. Perfect for mosques.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Islamic", "Geometric Design", "Lattice Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Navy Blue Sand", "#1e3a8a"),
        v("2", "Rich Brown Red", "#7c2d12"),
        v("4", "Deep Red Sand", "#991b1b"),
        v("5", "Navy Golden Tan", "#1d4ed8"),
        v("6", "Crimson Golden Tan", "#dc2626"),
        v("12", "Muted Grey Blue Brown", "#64748b"),
    ],
})

PRODUCTS.append({
    "name": "Faras-50", "sku": "FARAS-50",
    "short_desc": "Abstract marbled tie-dye checkered carpet — modern artistic, 6 colors",
    "full_desc": "Sun Fibre Faras-50 series — artistic carpet with marbled and tie-dye watercolor wash in checkered squares.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Distressed", "Digital Print", "Premium", "Modern"],
    "variants": [
        v("2", "Copper Burnt Orange", "#c2410c"),
        v("3", "Dusty Rose Maroon", "#9f1239"),
        v("4", "Golden Ochre Mustard", "#ca8a04"),
        v("5", "Slate Navy Blue", "#1e3a8a"),
        v("6", "Crimson Red Burgundy", "#991b1b"),
        v("12", "Taupe Dark Brown", "#78716c"),
    ],
})

PRODUCTS.append({
    "name": "IRani-53", "sku": "IRANI-53",
    "short_desc": "Iranian patchwork floral geometric carpet, 6 colors",
    "full_desc": "Sun Fibre IRani-53 series — Iranian patchwork with rustic stitched grid and stylized squares.",
    "unit": "sqft", "featured": False, **DP_PRICE,
    "tags": ["Patchwork", "Floral Design", "Geometric Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Navy Blue Grey", "#1e3a8a"),
        v("2", "Terracotta Orange Rust", "#c2410c"),
        v("4", "Beige Yellow Gold", "#ca8a04"),
        v("5", "Blue Grey", "#64748b"),
        v("6", "Deep Red Crimson", "#991b1b"),
        v("12", "Taupe Neutral Brown", "#78716c"),
    ],
})

PRODUCTS.append({
    "name": "HM-57", "sku": "HM-57",
    "short_desc": "Baroque Rococo scroll carpet — opulent acanthus, 6 colors",
    "full_desc": "Sun Fibre HM-57 series — opulent classical carpet with acanthus leaf scrolls in baroque Rococo style.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Scroll Design", "Digital Print", "Premium", "Luxury"],
    "variants": [
        v("0", "Dark Navy Blue", "#1e3a8a"),
        v("2", "Reddish Brown", "#7c2d12"),
        v("4", "Warm Beige Mustard", "#ca8a04"),
        v("5", "Ice Blue Light Slate", "#7dd3fc"),
        v("6", "Ruby Red", "#991b1b"),
        v("12", "Olive Brown", "#713f12"),
    ],
})

PRODUCTS.append({
    "name": "IRani-16", "sku": "IRANI-16",
    "short_desc": "Diamond marbled trellis runner — bold lattice, 7 colors",
    "full_desc": "Sun Fibre IRani-16 series — bold runner with thick diagonal lines forming diamond trellis.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Diamond Pattern", "Lattice Design", "Digital Print", "Premium", "Bold"],
    "variants": [
        v("2", "Light Brown", "#a87b56"),
        v("3", "Dark Chocolate Brown", "#5c3317"),
        v("4", "Golden Brown", "#a16207"),
        v("5", "Charcoal Grey", "#374151"),
        v("6", "Bright Red", "#dc2626"),
        v("11", "Magenta Fuchsia Pink", "#db2777"),
        v("13", "Turquoise Blue", "#0d9488"),
    ],
})

PRODUCTS.append({
    "name": "Sun-430", "sku": "SUN-430",
    "short_desc": "Heart paisley ornamental carpet — symmetrical oriental, 6 colors",
    "full_desc": "Sun Fibre Sun-430 series — decorative carpet with curved ornamental borders and flower medallions.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Floral Design", "Digital Print", "Premium", "Decorative"],
    "variants": [
        v("0", "Deep Royal Blue", "#1d4ed8"),
        v("2", "Rust Terracotta", "#c2410c"),
        v("4", "Golden Tan", "#ca8a04"),
        v("5", "Slate Blue", "#475569"),
        v("6", "Rich Red", "#dc2626"),
        v("12", "Light Taupe Beige", "#a87b56"),
    ],
})

PRODUCTS.append({
    "name": "Faras-47", "sku": "FARAS-47",
    "short_desc": "Persian patchwork medallion carpet — traditional oriental, 6 colors",
    "full_desc": "Sun Fibre Faras-47 series — Persian patchwork with circular floral medallions and oriental motifs.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Persian Style", "Patchwork", "Medallion Design", "Oriental Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Charcoal Dark Navy", "#374151"),
        v("2", "Light Peach Cream", "#fed7aa"),
        v("4", "Warm Cream Terracotta", "#fde68a"),
        v("5", "Light Slate Blue Cream", "#7dd3fc"),
        v("6", "Deep Crimson Maroon", "#991b1b"),
        v("12", "Cream Beige Gold", "#fde68a"),
    ],
})

PRODUCTS.append({
    "name": "Faras-56", "sku": "FARAS-56",
    "short_desc": "Elegant floral patchwork carpet — repeating panels, 6 colors",
    "full_desc": "Sun Fibre Faras-56 series — floral patchwork with grid panels and floral medallion bouquets.",
    "unit": "sqft", "featured": False, **DP_PRICE,
    "tags": ["Floral Design", "Patchwork", "Medallion Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Black Navy Gold", "#1e3a8a"),
        v("2", "Peach Salmon Pink Brown", "#fed7aa"),
        v("4", "Cream Tan Brown", "#fde68a"),
        v("5", "Sky Blue Navy Yellow", "#3b82f6"),
        v("6", "Crimson Pink White", "#dc2626"),
        v("12", "Cream Charcoal Pink", "#a87b56"),
    ],
})

PRODUCTS.append({
    "name": "Faras-46", "sku": "FARAS-46",
    "short_desc": "Concentric mandala plate grid carpet — checkerboard tiles, 6 colors",
    "full_desc": "Sun Fibre Faras-46 series — checkerboard grid where each square contains concentric mandala motif.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Mandala Design", "Digital Print", "Premium", "Persian Style"],
    "variants": [
        v("0", "Dark Charcoal Navy Silver", "#374151"),
        v("2", "Golden Brown Cream", "#a16207"),
        v("4", "Warm Beige Tan", "#a87b56"),
        v("5", "Ice Blue Grey", "#7dd3fc"),
        v("6", "Rich Ruby Burgundy", "#991b1b"),
        v("12", "Mocha Caramel Beige", "#92400e"),
    ],
})

PRODUCTS.append({
    "name": "Faras-49", "sku": "FARAS-49",
    "short_desc": "Star mandala patchwork carpet — complex oriental, 6 colors",
    "full_desc": "Sun Fibre Faras-49 series — complex oriental patchwork with multi-pointed star mandalas.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Mandala Design", "Patchwork", "Oriental Design", "Digital Print", "Premium", "Luxury"],
    "variants": [
        v("0", "Slate Navy Light Grey", "#475569"),
        v("2", "Terracotta Copper Cream", "#c2410c"),
        v("4", "Light Beige Olive Brown", "#a87b56"),
        v("5", "Dusty Teal Blue Grey", "#0f766e"),
        v("6", "Deep Crimson Red Black", "#991b1b"),
        v("12", "Cream Chocolate Tan", "#a16207"),
    ],
})

PRODUCTS.append({
    "name": "Sun-371", "sku": "SUN-371",
    "short_desc": "Distressed paisley patchwork carpet — modern rustic, 7 colors",
    "full_desc": "Sun Fibre Sun-371 series — modern rustic carpet with distressed grunge and paisley silhouettes.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Distressed", "Patchwork", "Digital Print", "Premium", "Modern", "Bold"],
    "variants": [
        v("2", "Rust Orange Tan", "#c2410c"),
        v("3", "Dark Brown Tan", "#5c3317"),
        v("4", "Mustard Yellow Brown", "#ca8a04"),
        v("5", "Indigo Slate Blue", "#1e3a8a"),
        v("6", "Bright Scarlet Red Black", "#dc2626"),
        v("11", "Magenta Fuchsia Pink", "#db2777"),
        v("13", "Turquoise Teal", "#0d9488"),
    ],
})

PRODUCTS.append({
    "name": "Sun-428", "sku": "SUN-428",
    "short_desc": "Modern brick geometric grid carpet — distressed industrial, 6 colors",
    "full_desc": "Sun Fibre Sun-428 series — industrial carpet with structured grid and brick-hatch fills.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Geometric Design", "Distressed", "Digital Print", "Premium", "Modern"],
    "variants": [
        v("0", "Navy Blue Dark Grey", "#1e3a8a"),
        v("2", "Light Brown Beige", "#a87b56"),
        v("4", "Tan Beige", "#d4a574"),
        v("5", "Greyish Blue", "#64748b"),
        v("6", "Deep Red", "#991b1b"),
        v("12", "Taupe Brownish Grey", "#78716c"),
    ],
})

PRODUCTS.append({
    "name": "Faras-52", "sku": "FARAS-52",
    "short_desc": "Damask scroll with horizontal stripes carpet — baroque, 6 colors",
    "full_desc": "Sun Fibre Faras-52 series — baroque ornamental foliage framing horizontal gradient bands.",
    "unit": "sqft", "featured": False, **DP_PRICE,
    "tags": ["Scroll Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Navy Slate Blue", "#1e3a8a"),
        v("2", "Terracotta Brown", "#92400e"),
        v("4", "Tan Gold Brown", "#a16207"),
        v("5", "Dusty Light Blue", "#7dd3fc"),
        v("6", "Crimson Red", "#dc2626"),
        v("12", "Cream Beige", "#fde68a"),
    ],
})

PRODUCTS.append({
    "name": "Faras-51", "sku": "FARAS-51",
    "short_desc": "Interlocking medallion scroll carpet — symmetrical botanical, 6 colors",
    "full_desc": "Sun Fibre Faras-51 series — classical carpet with symmetrical quarter-sections of circular medallions.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Medallion Design", "Scroll Design", "Digital Print", "Premium"],
    "variants": [
        v("2", "Terracotta Warm Brown", "#c2410c"),
        v("3", "Rust Red Brown", "#9f1239"),
        v("4", "Gold Yellow Beige", "#ca8a04"),
        v("5", "Slate Navy Blue", "#1e3a8a"),
        v("6", "Bright Red", "#dc2626"),
        v("12", "Taupe Cream Black", "#78716c"),
    ],
})

PRODUCTS.append({
    "name": "Faras-53 Wheel", "sku": "FARAS-53-V2",
    "short_desc": "Geometric wheel mandala grid carpet — radial tiled, 6 colors",
    "full_desc": "Sun Fibre Faras-53 Wheel series — grid carpet with circular geometric wheel designs.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Mandala Design", "Geometric Design", "Digital Print", "Premium"],
    "variants": [
        v("0", "Dark Navy Cream", "#1e3a8a"),
        v("2", "Orange Terracotta", "#c2410c"),
        v("4", "Beige Blue Brown", "#a87b56"),
        v("5", "Blue Navy Red", "#1d4ed8"),
        v("6", "Crimson Red", "#dc2626"),
        v("12", "Cream Tan Gold", "#fde68a"),
    ],
})

PRODUCTS.append({
    "name": "Faras-54", "sku": "FARAS-54",
    "short_desc": "Persian patchwork multi-panel medallion carpet — traditional, 6 colors",
    "full_desc": "Sun Fibre Faras-54 series — multi-panel Persian carpet with traditional medallions and floral borders.",
    "unit": "sqft", "featured": True, **DP_PRICE,
    "tags": ["Persian Style", "Patchwork", "Medallion Design", "Oriental Design", "Floral Design", "Digital Print", "Premium", "Luxury"],
    "variants": [
        v("2", "Terracotta Tan", "#c2410c"),
        v("3", "Rose Pink", "#9f1239"),
        v("4", "Gold Yellow Beige", "#ca8a04"),
        v("5", "Blue Light Blue", "#3b82f6"),
        v("6", "Deep Red", "#991b1b"),
        v("12", "Cream Beige Brown", "#fde68a"),
    ],
})

# ═══════════════════════════════════════════════════════════════════
# PHASE 6 — 29 Digital Print Designs
# ═══════════════════════════════════════════════════════════════════

PRODUCTS.append({"name":"Sun-415","sku":"SUN-415","short_desc":"Damask medallion on marble texture, 6 colors","full_desc":"Sun-415 — classical damask medallion motifs over veined marble background.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Medallion Design","Digital Print","Premium"],"variants":[v("2","Light Beige Peach","#fde68a"),v("3","Dusty Rose Peach","#f9a8d4"),v("4","Cream Ivory","#fef3c7"),v("5","Slate Blue","#475569"),v("6","Deep Burgundy Red","#991b1b"),v("8","Vibrant Green","#15803d")]})

PRODUCTS.append({"name":"Sun-418","sku":"SUN-418","short_desc":"Modern geometric block patchwork — runner, 6 colors","full_desc":"Sun-418 — modern runner with geometric block patchwork.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Patchwork","Digital Print","Premium","Modern"],"variants":[v("0","Deep Navy Blue Cream","#1e3a8a"),v("2","Terracotta Brown Red","#92400e"),v("4","Beige Olive Golden Brown","#a87b56"),v("5","Blue Grey Cream","#64748b"),v("6","Vibrant Red Black Beige","#b91c1c"),v("12","Light Brown Cream Olive","#a16207")]})

PRODUCTS.append({"name":"Sun-423","sku":"SUN-423","short_desc":"Islamic geometric star pattern — interlocking, 6 colors","full_desc":"Sun-423 — Islamic-inspired carpet with geometric star pattern.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Islamic","Geometric Design","Digital Print","Premium"],"variants":[v("2","Warm Terracotta Orange","#c2410c"),v("3","Dusty Rose Brown","#9f1239"),v("4","Soft Peach","#fed7aa"),v("5","Cool Slate Blue Grey","#64748b"),v("6","Bright Vibrant Red","#dc2626"),v("12","Light Taupe Beige","#d4a574")]})

PRODUCTS.append({"name":"Sun-414","sku":"SUN-414","short_desc":"Abstract organic web cracked texture — modern, 6 colors","full_desc":"Sun-414 — artistic carpet with abstract web/cracked texture.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Distressed","Digital Print","Premium","Modern"],"variants":[v("2","Tan Beige","#d4a574"),v("3","Dusty Pink Beige","#f9a8d4"),v("4","Mustard Gold Beige","#ca8a04"),v("5","Slate Blue","#475569"),v("6","Deep Crimson Burgundy","#991b1b"),v("13","Bright Turquoise Teal","#0d9488")]})

PRODUCTS.append({"name":"Faras-9","sku":"FARAS-9","short_desc":"Persian patchwork with mythical creatures — luxury, 6 colors","full_desc":"Faras-9 — ornate Persian patchwork with mandalas and mythical creature medallions.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Persian Style","Patchwork","Mandala Design","Digital Print","Premium","Luxury"],"variants":P_FARAS_6A})

PRODUCTS.append({"name":"Sun-397","sku":"SUN-397","short_desc":"Floral framed motif grid — rose bouquets, 6 colors","full_desc":"Sun-397 — floral motif pattern with rose bouquets and framed accents.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Floral Design","Digital Print","Premium","Decorative"],"variants":[v("2","Soft Peach Tan","#fed7aa"),v("3","Cream Beige","#fef3c7"),v("4","Warm Yellow Beige","#fde68a"),v("5","Slate Blue","#475569"),v("6","Vibrant Ruby Red","#b91c1c"),v("8","Light Green","#84cc16")]})

PRODUCTS.append({"name":"Faras-4","sku":"FARAS-4","short_desc":"Classic Persian patchwork tiles with medallions, 6 colors","full_desc":"Faras-4 — Persian patchwork tile carpet with floral medallions.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Persian Style","Patchwork","Medallion Design","Floral Design","Digital Print","Premium"],"variants":[v("2","Warm Reddish Brown Tan","#92400e"),v("3","Rosy Terracotta Copper","#c2410c"),v("4","Light Brown Khaki Beige","#a87b56"),v("5","Deep Navy Slate Blue","#1e3a8a"),v("6","Crimson Red Cream","#991b1b"),v("12","Dark Chocolate Charcoal","#5c3317")]})

PRODUCTS.append({"name":"Faras-43","sku":"FARAS-43","short_desc":"Abstract brick block geometric — overlapping rectangles, 6 colors","full_desc":"Faras-43 — abstract geometric carpet with overlapping brick blocks.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Digital Print","Premium","Modern"],"variants":[v("0","Dark Navy Charcoal Black","#1e3a8a"),v("2","Warm Terracotta Orange Brown","#c2410c"),v("4","Golden Tan Cream Brown","#a16207"),v("5","Denim Blue Slate Grey","#475569"),v("6","Vibrant Crimson Maroon","#991b1b"),v("12","Muted Taupe Mocha Grey Brown","#78716c")]})

PRODUCTS.append({"name":"IRani-49","sku":"IRANI-49","short_desc":"Triangle patchwork kaleidoscope with floral vines, 6 colors","full_desc":"IRani-49 — Iranian triangular patchwork with floral vines.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Patchwork","Floral Design","Digital Print","Premium"],"variants":[v("0","Navy Blue Black Beige","#1e3a8a"),v("2","Soft Tan Cream Brown","#d4a574"),v("4","Cream Light Gold Blue","#fde68a"),v("5","Steel Blue Light Grey","#64748b"),v("6","Vibrant Red White Burgundy","#b91c1c"),v("12","Pale Cream Beige Burgundy","#fef3c7")]})

PRODUCTS.append({"name":"Faras-38","sku":"FARAS-38","short_desc":"Checked grid with marbled damask watermark, 6 colors","full_desc":"Faras-38 — checked block grid with marbled damask watermark.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Digital Print","Premium","Modern"],"variants":[v("0","Indigo Blue Tan Beige","#1e3a8a"),v("2","Rust Brown Sky Blue","#92400e"),v("4","Ochre Yellow Denim Cream","#ca8a04"),v("5","Lavender Blue Cream Tan","#a5b4fc"),v("6","Deep Red Peach Cream","#991b1b"),v("12","Neutral Taupe Dark Brown","#78716c")]})

PRODUCTS.append({"name":"Sun-396","sku":"SUN-396","short_desc":"Geometric tribal ethnic diamond mat, 6 colors","full_desc":"Sun-396 — tribal mat with central diamond and stepped shapes.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Diamond Pattern","Geometric Design","Digital Print","Premium"],"variants":[v("2","Blue Light Brown","#3b82f6"),v("3","Brown Beige","#92400e"),v("4","Lavender Beige","#c4b5fd"),v("5","Dark Blue Light Blue Tan","#1d4ed8"),v("6","Red Navy Blue Center","#dc2626"),v("13","Turquoise Brown","#0d9488")]})

PRODUCTS.append({"name":"Farsi-3","sku":"FARSI-3","short_desc":"Persian patchwork with floral mandalas, 6 colors","full_desc":"Farsi-3 — Persian patchwork with floral mandalas and scrolling vines.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Persian Style","Patchwork","Mandala Design","Lattice Design","Digital Print","Premium"],"variants":[v("2","Light Beige Tan","#d4a574"),v("3","Dusty Rose Brown","#9f1239"),v("4","Golden Brown","#a16207"),v("5","Slate Navy Blue","#1e3a8a"),v("6","Deep Red","#991b1b"),v("12","Grey Taupe","#78716c")]})

PRODUCTS.append({"name":"Faras-6","sku":"FARAS-6","short_desc":"Classic damask floral scroll all-over pattern, 6 colors","full_desc":"Faras-6 — classic damask floral scroll all-over pattern.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Floral Design","Scroll Design","Digital Print","Premium"],"variants":[v("2","Terracotta Orange","#c2410c"),v("3","Dusty Rose Mauve","#9f1239"),v("4","Burgundy Brown","#7c2d12"),v("5","Deep Purple White","#6b21a8"),v("6","Vibrant Red Maroon","#b91c1c"),v("12","Charcoal Grey Cream","#374151")]})

PRODUCTS.append({"name":"Farsi-2","sku":"FARSI-2","short_desc":"Eclectic block patchwork with floral and chain shapes, 6 colors","full_desc":"Farsi-2 — eclectic block patchwork with floral panels and chain shapes.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Patchwork","Floral Design","Digital Print","Premium"],"variants":[v("2","Beige Cream","#fde68a"),v("3","Light Peach Brown","#fed7aa"),v("4","Light Tan","#d4a574"),v("5","Navy Blue Denim","#1e3a8a"),v("6","Red Maroon","#b91c1c"),v("12","Greyish Taupe","#78716c")]})

PRODUCTS.append({"name":"Sun-421","sku":"SUN-421","short_desc":"Diagonal diamond lattice with baroque florals, 6 colors","full_desc":"Sun-421 — diamond grid lattice with baroque floral motifs.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Diamond Pattern","Floral Design","Lattice Design","Digital Print","Premium"],"variants":[v("2","Orange Brown","#c2410c"),v("3","Burgundy","#7c2d12"),v("4","Golden Brown","#a16207"),v("5","Navy Slate Blue","#1e3a8a"),v("6","Deep Red Black","#991b1b"),v("12","Light Olive Brown","#713f12")]})

PRODUCTS.append({"name":"Faras-44","sku":"FARAS-44","short_desc":"Tile-like square compartments with scrollwork, 6 colors","full_desc":"Faras-44 — tile compartments with scrollwork patterns.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Geometric Design","Scroll Design","Digital Print","Premium"],"variants":[v("0","Navy Blue Black White","#1e3a8a"),v("2","Warm Orange Terracotta Beige","#c2410c"),v("4","Cream Beige Golden Brown","#fde68a"),v("5","Slate Dark Blue Cream","#475569"),v("6","Deep Red Cream","#991b1b"),v("12","Light Taupe Beige Brown","#a87b56")]})

PRODUCTS.append({"name":"IRani-51","sku":"IRANI-51","short_desc":"Multi-compartment patchwork with rose bouquets, 6 colors","full_desc":"IRani-51 — Iranian patchwork with rose bouquets and ornamental medallions.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Patchwork","Floral Design","Medallion Design","Digital Print","Premium"],"variants":[v("2","Warm Sand Gold Blue","#d4a574"),v("3","Soft Dusty Pink Cream","#f9a8d4"),v("4","Warm Yellow Ochre Blue","#ca8a04"),v("5","Slate Blue Red Rose","#475569"),v("6","Maroon Red Beige","#991b1b"),v("12","Cream Beige Red Rose","#fef3c7")]})

PRODUCTS.append({"name":"Faras-36","sku":"FARAS-36","short_desc":"Circular mandalas with octagonal umbrella medallions, 6 colors","full_desc":"Faras-36 — mandalas with octagonal umbrella medallions.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Mandala Design","Geometric Design","Medallion Design","Digital Print","Premium"],"variants":[v("0","Black Violet Cream Brown","#1f2937"),v("2","Chocolate Brown Tan Gold","#5c3317"),v("4","Tan Caramel Brown Cream Grey","#a16207"),v("5","Blue Grey Navy Cream","#64748b"),v("6","Burgundy Red Bright Red","#991b1b"),v("12","Deep Brown Cream","#78350f")]})

PRODUCTS.append({"name":"Sun-419","sku":"SUN-419","short_desc":"Diamond trellis with rose bouquets, 6 colors","full_desc":"Sun-419 — diamond-grid framework with rose bouquets.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Floral Design","Diamond Pattern","Lattice Design","Digital Print","Premium","Decorative"],"variants":[v("0","Deep Navy Blue","#1e3a8a"),v("2","Warm Sandy Beige","#d4a574"),v("4","Soft Gold Mustard","#ca8a04"),v("5","Soft Steel Blue","#7dd3fc"),v("6","Vibrant Crimson Red","#dc2626"),v("12","Greige Light Grey","#a8a29e")]})

PRODUCTS.append({"name":"Faras-5","sku":"FARAS-5","short_desc":"Islamic star lattice mosaic — interlocking, 6 colors","full_desc":"Faras-5 — interlocking Islamic star lattice mosaic.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Islamic","Lattice Design","Geometric Design","Digital Print","Premium"],"variants":[v("2","Terracotta Copper Orange","#c2410c"),v("3","Dusty Rose Mauve","#9f1239"),v("4","Light Sand Beige","#fde68a"),v("5","Slate Blue Grey","#64748b"),v("6","Deep Ruby Red Black","#991b1b"),v("12","Warm Taupe Brown","#78716c")]})

PRODUCTS.append({"name":"IRani-52","sku":"IRANI-52","short_desc":"Distressed abstract marble stone texture, 6 colors","full_desc":"IRani-52 — distressed marble or stone texture.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Distressed","Digital Print","Premium","Modern"],"variants":[v("2","Beige Light Brown Cream","#d4a574"),v("3","Muted Plum Reddish Brown","#9f1239"),v("4","Mid Brown Cream","#92400e"),v("5","Grey Purple Lavender","#6b21a8"),v("6","Vibrant Red Cream","#dc2626"),v("10","Blue Teal Navy Cream","#0f766e")]})

PRODUCTS.append({"name":"Sun-417","sku":"SUN-417","short_desc":"Framed squares with paisley backgrounds, 6 colors","full_desc":"Sun-417 — grid of framed squares with paisley backdrops and floral branch scrolls.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Floral Design","Digital Print","Premium","Decorative"],"variants":[v("2","Rust Orange Green Grey","#c2410c"),v("3","Dark Reddish Brown Beige","#7c2d12"),v("4","Camel Brown Blue Grey","#a87b56"),v("5","Dark Blue Beige Gold","#1e3a8a"),v("6","Bright Red Beige Gold","#dc2626"),v("8","Vibrant Green Beige Gold","#15803d")]})

PRODUCTS.append({"name":"Faras-37","sku":"FARAS-37","short_desc":"Checkerboard panels with floral wreath motifs, 6 colors","full_desc":"Faras-37 — checkerboard panels with floral wreath motifs.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Floral Design","Digital Print","Premium","Decorative"],"variants":[v("2","Light Peach Orange Brown","#fed7aa"),v("3","Dusty Pink Mauve Chocolate","#f9a8d4"),v("4","Beige Dark Brown","#a87b56"),v("5","Slate Blue Dark Navy","#475569"),v("6","Crimson Red Burgundy","#991b1b"),v("12","Grey Taupe Light Brown","#78716c")]})

PRODUCTS.append({"name":"Faras-7","sku":"FARAS-7","short_desc":"Patchwork with star mandalas and tree of life, 6 colors","full_desc":"Faras-7 — patchwork combining star mandalas and tree-of-life motifs.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Mandala Design","Patchwork","Persian Style","Digital Print","Premium"],"variants":[v("2","Peach Terracotta Brown","#fed7aa"),v("3","Light Brown Taupe","#a87b56"),v("4","Warm Ochre Tan","#ca8a04"),v("5","Dark Purple Grey Teal","#6b21a8"),v("6","Bright Red","#dc2626"),v("12","Mid Brown","#78350f")]})

PRODUCTS.append({"name":"Faras-8","sku":"FARAS-8","short_desc":"Intricate patchwork with floral vases and baroque borders, 6 colors","full_desc":"Faras-8 — patchwork with floral vases and Baroque borders.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Patchwork","Floral Design","Persian Style","Digital Print","Premium","Luxury"],"variants":[v("2","Cream Cocoa Brown","#d4a574"),v("3","Soft Orange Terracotta","#c2410c"),v("4","Light Beige Brown","#fde68a"),v("5","Dusty Lavender Grey","#a5b4fc"),v("6","Rust Red","#b91c1c"),v("12","Tan Golden Brown","#a16207")]})

PRODUCTS.append({"name":"Faras-41","sku":"FARAS-41","short_desc":"Interlocking basketweave parquet wood-block, 6 colors","full_desc":"Faras-41 — basketweave/parquet wood-block geometric square pattern.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Digital Print","Premium","Modern"],"variants":[v("0","Navy Blue Light Denim","#1e3a8a"),v("2","Peach Beige Chocolate Brown","#fed7aa"),v("4","Light Gold Cream Dark Brown","#ca8a04"),v("5","Medium Blue Powder Blue","#3b82f6"),v("6","Dark Crimson Vibrant Red","#991b1b"),v("12","Sandy Beige Warm Brown","#d4a574")]})

PRODUCTS.append({"name":"Faras-40","sku":"FARAS-40","short_desc":"Modern block patchwork with tire-tread stripes, 6 colors","full_desc":"Faras-40 — block patchwork with textured tire-tread vertical stripes.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Geometric Design","Digital Print","Premium","Modern"],"variants":[v("0","Dark Indigo Ice Blue","#1e3a8a"),v("2","Terracotta Rust Cream","#c2410c"),v("4","Mustard Yellow Espresso","#ca8a04"),v("5","Slate Blue Off White","#64748b"),v("6","Dark Burgundy Bright Red","#991b1b"),v("12","Muted Taupe Beige Brown","#78716c")]})

PRODUCTS.append({"name":"Faras-42","sku":"FARAS-42","short_desc":"Modern abstract marble-veined block texture, 6 colors","full_desc":"Faras-42 — abstract carpet with marble-veined block texture.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Distressed","Digital Print","Premium","Modern"],"variants":[v("0","Charcoal Blue Sky Blue","#475569"),v("2","Warm Caramel Cream","#c2410c"),v("4","Honey Gold Light Beige","#ca8a04"),v("5","Steel Blue Ice Grey","#64748b"),v("6","Rich Burgundy Bright Red","#991b1b"),v("12","Earthy Taupe Brown","#78716c")]})

PRODUCTS.append({"name":"Faras-39","sku":"FARAS-39","short_desc":"Classic Persian patchwork with mandala medallions, 6 colors","full_desc":"Faras-39 — Persian patchwork with mandala medallions and border scrolls.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Persian Style","Mandala Design","Medallion Design","Patchwork","Scroll Design","Digital Print","Premium"],"variants":[v("0","Dark Indigo Navy Grey","#1e3a8a"),v("2","Peach Pink Terracotta","#fed7aa"),v("4","Tan Gold Ivory","#ca8a04"),v("5","Soft Periwinkle Lavender","#a5b4fc"),v("6","Deep Crimson Scarlet","#991b1b"),v("12","Warm Beige Cream Rose","#d4a574")]})

print(f"📦 Phase 5 + 6 loaded: total {len(PRODUCTS)} products in data file")

# ═══════════════════════════════════════════════════════════════════
# PHASE 7 — 16 New Digital Print Designs
# (5 duplicates skipped: Sun-415, Sun-414, Sun-417, Sun-397, Sun-396)
# ═══════════════════════════════════════════════════════════════════

PRODUCTS.append({"name":"IRani-43","sku":"IRANI-43","short_desc":"3D cubic geometric facets with marbled tree silhouettes, 6 colors","full_desc":"IRani-43 — abstract geometric design with intersecting polygonal cubic blocks, marbleized texture fills, and stylized leafless tree silhouettes.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Digital Print","Premium","Modern"],"variants":[v("2","Tan Beige","#d4a574"),v("3","Brown Cream","#92400e"),v("4","Light Cream Tan","#fde68a"),v("5","Blue Grey","#64748b"),v("6","Deep Red Burgundy","#991b1b"),v("11","Pink Magenta","#db2777")]})

PRODUCTS.append({"name":"Sun-395","sku":"SUN-395","short_desc":"Checkerboard grid with scrollwork and floral vines, 6 colors","full_desc":"Sun-395 — checkerboard grid design with alternating squares of elegant scrollwork and swirling floral vine patterns.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Floral Design","Scroll Design","Digital Print","Premium","Decorative"],"variants":[v("2","Brown Cream Blue Grey","#a87b56"),v("3","Brown White","#78350f"),v("4","Grey Blue Gold","#64748b"),v("5","Blue Gold","#1d4ed8"),v("6","Red Gold","#b91c1c"),v("11","Purple Cream","#9333ea")]})

PRODUCTS.append({"name":"IRani-44","sku":"IRANI-44","short_desc":"Hexagonal lattice with classical floral mandalas, 6 colors","full_desc":"IRani-44 — bold geometric hexagonal lattice forming vertical columns containing classical floral diamonds and mandalas.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Mandala Design","Lattice Design","Floral Design","Digital Print","Premium"],"variants":[v("2","Light Brown","#a87b56"),v("3","Cream Brown","#fde68a"),v("4","Beige Gold","#ca8a04"),v("5","Blue Grey","#64748b"),v("6","Vibrant Red","#dc2626"),v("13","Teal Turquoise","#0d9488")]})

PRODUCTS.append({"name":"IRani-39","sku":"IRANI-39","short_desc":"Diagonal chain-link with wood-grain diamond panels, 6 colors","full_desc":"IRani-39 — diagonal chain-link or woven lattice design with wood-grain textured diamond panels. Modern industrial aesthetic.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Diamond Pattern","Lattice Design","Digital Print","Premium","Modern"],"variants":[v("2","Grey Brown","#78716c"),v("3","Brown Tan","#92400e"),v("4","Beige Cream","#d4a574"),v("5","Slate Blue","#475569"),v("6","Bright Red","#dc2626"),v("13","Teal Turquoise","#0d9488")]})

PRODUCTS.append({"name":"Sun-393","sku":"SUN-393","short_desc":"Central ornate medallion with sunburst florals, 6 colors","full_desc":"Sun-393 — large central ornate square motif with classical corner brackets, surrounded by circular sunburst floral blossoms.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Medallion Design","Floral Design","Digital Print","Premium","Decorative"],"variants":[v("2","Tan Blue Accents","#d4a574"),v("3","Brown Gold","#92400e"),v("4","Yellow Cream","#fde68a"),v("5","Light Blue","#3b82f6"),v("6","Bright Red","#dc2626"),v("10","Dark Blue","#1e3a8a")]})

PRODUCTS.append({"name":"IRani-40","sku":"IRANI-40","short_desc":"Interlocking hexagonal trellis with marble texture, 6 colors","full_desc":"IRani-40 — interlocking geometric trellis forming hexagonal chains with marble-textured pattern inside.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Lattice Design","Geometric Design","Digital Print","Premium"],"variants":[v("2","Light Pink Beige","#fed7aa"),v("3","Brownish Pink","#f9a8d4"),v("4","Cream Tan","#fde68a"),v("5","Blue Grey","#64748b"),v("6","Deep Red","#991b1b"),v("8","Vibrant Green","#15803d")]})

PRODUCTS.append({"name":"Sun-389","sku":"SUN-389","short_desc":"Abstract fluid marbled brushstroke texture, 6 colors","full_desc":"Sun-389 — abstract fluid swirls and marbled brushstroke textures. Modern artistic aesthetic.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Distressed","Digital Print","Premium","Modern"],"variants":[v("2","Brown Tan","#92400e"),v("3","Dark Red Brown","#7c2d12"),v("4","Gold Beige","#ca8a04"),v("5","Greyish Blue","#64748b"),v("6","Bright Red","#dc2626"),v("13","Turquoise Aqua","#0d9488")]})

PRODUCTS.append({"name":"NC-5","sku":"NC-5","short_desc":"3D geometric optical illusion with step blocks, 6 colors","full_desc":"NC-5 — 3D geometric optical illusion of interlocking step-like rectangular blocks with striped details.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Digital Print","Premium","Modern"],"variants":[v("2","Brown Beige","#92400e"),v("3","Light Tan Blue","#d4a574"),v("4","Yellowish Beige","#fde68a"),v("5","Blue Grey","#475569"),v("6","Vibrant Red Gold","#dc2626"),v("13","Teal Light Blue","#0d9488")]})

PRODUCTS.append({"name":"Sun-390","sku":"SUN-390","short_desc":"Rectangular grid with feathered paint gradients, 6 colors","full_desc":"Sun-390 — rectangular grid blocks with feathered, paint-like textured gradients. Modern abstract aesthetic.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Distressed","Digital Print","Premium","Modern"],"variants":[v("2","Tan Blue","#d4a574"),v("3","Tan Brown","#92400e"),v("4","Brown Grey","#78716c"),v("5","Blue Grey","#475569"),v("6","Red Grey","#b91c1c"),v("8","Green Tan","#15803d")]})

PRODUCTS.append({"name":"IRani-35","sku":"IRANI-35","short_desc":"Abstract mosaic of sharp triangles with distressed paint, 6 colors","full_desc":"IRani-35 — modern abstract mosaic of sharp triangles and polygonal shapes with distressed textured paint finish.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Distressed","Digital Print","Premium","Modern"],"variants":[v("2","Tan Brown","#92400e"),v("3","Muted Brown","#78716c"),v("4","Yellow Gold","#ca8a04"),v("5","Grey Blue","#64748b"),v("6","Red Brown","#991b1b"),v("10","Vivid Blue","#1e3a8a")]})

PRODUCTS.append({"name":"IRani-34","sku":"IRANI-34","short_desc":"Block grid with textured shades and vine motifs, 6 colors","full_desc":"IRani-34 — modern geometric block/grid pattern with rectangular tiles alternating textured solid shades and cream squares with vine and leaf motifs.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Floral Design","Geometric Design","Digital Print","Premium","Modern"],"variants":[v("2","Tan Brown Pink","#d4a574"),v("3","Dark Brown Cream","#78350f"),v("4","Beige Brown","#a87b56"),v("5","Blue Grey Red","#64748b"),v("6","Red Pink Cream","#991b1b"),v("11","Pink Magenta","#db2777"),v("13","Teal Aqua","#0d9488")]})

PRODUCTS.append({"name":"IRani-36","sku":"IRANI-36","short_desc":"Retro interlocking waves with teardrop centers, 6 colors","full_desc":"IRani-36 — retro geometric design with interlocking wavy ribbon-like waves forming pseudo-hexagonal spaces with rounded teardrop centers.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Digital Print","Premium","Modern"],"variants":[v("2","Brown Tan","#92400e"),v("3","Dark Brown","#78350f"),v("4","Gold Beige","#ca8a04"),v("5","Blue Cream","#1d4ed8"),v("6","Red Cream","#dc2626"),v("13","Teal Turquoise","#0d9488")]})

PRODUCTS.append({"name":"NC-4","sku":"NC-4","short_desc":"Whimsical floral swirls with framed motifs, 7 colors","full_desc":"NC-4 — whimsical floral and swirl design with dense spiral scribbles backdrop and square framed floral motifs.","unit":"sqft","featured":False,**DP_PRICE,"tags":["Floral Design","Digital Print","Premium","Decorative"],"variants":[v("2","Peach Tan","#fed7aa"),v("3","Dusty Pink","#f9a8d4"),v("4","Yellow Gold","#fde68a"),v("5","Blue Grey","#64748b"),v("6","Bright Red","#dc2626"),v("8","Green","#15803d"),v("11","Pink Magenta","#db2777")]})

PRODUCTS.append({"name":"IRani-33","sku":"IRANI-33","short_desc":"Elegant flame-like overlapping leaf scales, 7 colors","full_desc":"IRani-33 — elegant flame-like or curved overlapping leaf/scale pattern repeating vertically and horizontally in dual-tone textured color waves.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Digital Print","Premium","Decorative"],"variants":[v("2","Tan Pink Multi","#d4a574"),v("3","Red Brown Multi","#991b1b"),v("4","Blue Teal","#3b82f6"),v("5","Yellow Teal","#ca8a04"),v("6","Red Burgundy","#dc2626"),v("11","Pink Purple","#db2777"),v("13","Teal Turquoise","#0d9488")]})

PRODUCTS.append({"name":"Sun-388","sku":"SUN-388","short_desc":"Bold geometric triangles with horizontal stripe gradients, 7 colors","full_desc":"Sun-388 — bold geometric pattern of interlocking triangles and diamonds with horizontal stripe gradients creating 3D faceted prism effect.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Geometric Design","Digital Print","Premium","Modern","Bold"],"variants":[v("2","Brown Tan","#92400e"),v("3","Light Brown","#a87b56"),v("4","Orange Tan","#c2410c"),v("5","Blue Grey","#475569"),v("6","Red Stripes","#dc2626"),v("11","Pink Magenta","#db2777"),v("13","Teal Aqua","#0d9488")]})

PRODUCTS.append({"name":"IRani-37","sku":"IRANI-37","short_desc":"Diverse patchwork grid with sub-patterns, 6 colors","full_desc":"IRani-37 — diverse patchwork grid with large squares containing distinct sub-patterns like concentric squares, cobblestones, ovals, and marbled textures.","unit":"sqft","featured":True,**DP_PRICE,"tags":["Patchwork","Digital Print","Premium"],"variants":[v("2","Tan Brown","#d4a574"),v("3","Brown Cream","#92400e"),v("4","Beige Gold","#ca8a04"),v("5","Blue Grey","#475569"),v("6","Deep Red","#991b1b"),v("7","Purple Violet","#7c3aed")]})

print(f"📦 Phase 7 loaded: total {len(PRODUCTS)} products in data file")
