export const PROJECT_TEMPLATES = [
    {
        id: 'restaurant',
        name: 'Restaurante / Gastronomía',
        icon: 'restaurant',
        color: 'from-amber-500 to-orange-500',
        description: 'Restaurantes, cafeterías, delivery, food trucks.',
        defaults: {
            industry: 'Alimentos y Bebidas / Gastronomía',
            suggested_memories: [
                { category: 'products', key: 'Menú principal', value: 'Describe aquí tus platos estrella...' },
                { category: 'customers', key: 'Comensal frecuente', value: 'Describe tu cliente típico...' },
                { category: 'note', key: 'Horarios', value: 'Lunes a domingo, 12pm-11pm' },
            ],
            suggested_objectives: [
                { title: 'Crecer delivery +30%', description: 'En próximos 3 meses' },
                { title: 'Aumentar ticket promedio', description: 'Con combos y upsell' },
            ],
            suggested_competitors_query: 'restaurantes populares',
        },
    },
    {
        id: 'ecommerce',
        name: 'E-commerce / Tienda online',
        icon: 'storefront',
        color: 'from-cyan-500 to-blue-500',
        description: 'Tiendas online, marketplaces, marcas D2C.',
        defaults: {
            industry: 'E-commerce / Retail Online',
            suggested_memories: [
                { category: 'products', key: 'Catálogo destacado', value: 'Describe tus productos top y categorías...' },
                { category: 'customers', key: 'Buyer persona', value: 'Perfil del comprador online recurrente...' },
                { category: 'note', key: 'Envíos', value: 'Cobertura nacional, envío gratis desde X' },
            ],
            suggested_objectives: [
                { title: 'Aumentar conversión +20%', description: 'Optimizar checkout y fichas de producto' },
                { title: 'Reducir abandono de carrito', description: 'Email recovery + retargeting' },
            ],
            suggested_competitors_query: 'tiendas online mismo nicho',
        },
    },
    {
        id: 'saas',
        name: 'SaaS / Software',
        icon: 'code',
        color: 'from-violet-500 to-purple-500',
        description: 'Productos digitales, plataformas, apps B2B.',
        defaults: {
            industry: 'Tecnología / Software',
            suggested_memories: [
                { category: 'products', key: 'Features clave', value: 'Funcionalidades principales del producto...' },
                { category: 'customers', key: 'ICP (Ideal Customer Profile)', value: 'Empresas de X tamaño en sector Y...' },
                { category: 'note', key: 'Modelo de pricing', value: 'Freemium / tiers mensuales / anual' },
            ],
            suggested_objectives: [
                { title: 'Reducir churn mensual', description: 'Mejorar onboarding y activación' },
                { title: 'Crecer MRR +25%', description: 'Foco en upgrades y expansion revenue' },
            ],
            suggested_competitors_query: 'plataformas SaaS competencia directa',
        },
    },
    {
        id: 'agency',
        name: 'Agencia de marketing',
        icon: 'campaign',
        color: 'from-pink-500 to-rose-500',
        description: 'Agencias creativas, estudios, freelance marketing.',
        defaults: {
            industry: 'Marketing / Publicidad / Mercadeo',
            suggested_memories: [
                { category: 'products', key: 'Servicios core', value: 'Branding, social media, performance, diseño...' },
                { category: 'customers', key: 'Tipo de cliente', value: 'PYMEs, startups, marcas medianas...' },
                { category: 'note', key: 'Modelo de trabajo', value: 'Retainer mensual / proyectos puntuales' },
            ],
            suggested_objectives: [
                { title: 'Cerrar 3 nuevas cuentas/mes', description: 'Pipeline activo y demos' },
                { title: 'Mejorar retención de clientes', description: 'Reportes mensuales + QBRs' },
            ],
            suggested_competitors_query: 'agencias de marketing reconocidas',
        },
    },
    {
        id: 'personal',
        name: 'Marca personal',
        icon: 'person',
        color: 'from-emerald-500 to-teal-500',
        description: 'Coaches, consultores, influencers, profesionales independientes.',
        defaults: {
            industry: 'Servicios Legales / Consultoría',
            suggested_memories: [
                { category: 'products', key: 'Servicios / productos', value: 'Mentorías, cursos, consultorías, contenido...' },
                { category: 'customers', key: 'Audiencia objetivo', value: 'Describe a quién quieres ayudar...' },
                { category: 'note', key: 'Posicionamiento', value: 'Experto en X con enfoque Y' },
            ],
            suggested_objectives: [
                { title: 'Crecer audiencia +5k/mes', description: 'Contenido consistente en 1-2 canales' },
                { title: 'Lanzar producto digital', description: 'Curso, ebook o membresía' },
            ],
            suggested_competitors_query: 'referentes en mi nicho personal',
        },
    },
    {
        id: 'blank',
        name: 'Empezar desde cero',
        icon: 'add',
        color: 'from-slate-400 to-slate-600',
        description: 'Sin template, tú eliges todo manualmente.',
        defaults: null,
    },
];
