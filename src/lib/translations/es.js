// Spanish, keyed by the English source string. Anything absent falls back to
// English rather than showing a key, so this file can grow safely.
//
// House style: Spain Spanish, tuteo (informal "tú"), and money words as a
// Spanish bank app would use them — "gasto" not "coste", "ingreso" not
// "renta". Emoji stay in the English source and are not repeated here.
export const es = {
  // Home
  'Good night': 'Buenas noches',
  'Good morning': 'Buenos días',
  'Good afternoon': 'Buenas tardes',
  'Good evening': 'Buenas noches',
  'Scan receipt': 'Escanear recibo',
  'Profile': 'Perfil',
  'Previous month': 'Mes anterior',
  'Next month': 'Mes siguiente',
  'Overspent this month': 'Gastado de más este mes',
  'Saved this month': 'Ahorrado este mes',
  '{pct}% of your income': '{pct}% de tus ingresos',
  'Income': 'Ingresos',
  'Expenses': 'Gastos',
  'Recent income': 'Ingresos recientes',
  'Recent expenses': 'Gastos recientes',
  'Recent': 'Recientes',
  'View all →': 'Ver todo →',
  'No income logged in {month} yet.': 'Aún no hay ingresos en {month}.',
  'Nothing spent in {month} yet.': 'Aún no hay gastos en {month}.',
  'Nothing logged in {month} yet.': 'Aún no hay nada en {month}.',
  'Coming up': 'Próximos',
  'Nothing due in the next 25 days. Rent and monthly charges appear here as their date comes round.':
    'No hay nada en los próximos 25 días. El alquiler y los cargos mensuales aparecen aquí al acercarse su fecha.',
  'Today': 'Hoy',
  'Tomorrow': 'Mañana',
  'In {n} days': 'En {n} días',

  // Add expense / income
  '🤝 Together': '🤝 Juntos',
  '👤 Mine': '👤 Mío',
  '💼 Business': '💼 Negocio',
  "What was this {category} for? Give it a name so you'll recognise it later.":
    '¿Para qué fue este {category}? Ponle un nombre para reconocerlo después.',
  'New income': 'Nuevo ingreso',
  'New expense': 'Nuevo gasto',
  'Scan': 'Escanear',
  'Expense': 'Gasto',
  'Amount': 'Importe',
  'What was it': '¿Qué fue?',
  'What was it (optional)': '¿Qué fue? (opcional)',
  'e.g. August invoice': 'p. ej. factura de agosto',
  'e.g. Lidl, dentist, haircut': 'p. ej. Lidl, dentista, peluquería',
  '🧺 Need': '🧺 Necesidad',
  '🍦 Treat': '🍦 Capricho',
  'Date': 'Fecha',
  'Repeats monthly': 'Se repite cada mes',
  'Scan and save to Dropbox': 'Escanear y guardar en Dropbox',
  'Keeps the invoice for your gestor': 'Guarda la factura para tu gestor',
  'More ways to add expenses': 'Más formas de añadir gastos',
  'Import from bank': 'Importar del banco',
  'CSV statement': 'Extracto CSV',
  'Delete': 'Eliminar',
  'Saving…': 'Guardando…',
  'Update {amount}': 'Actualizar {amount}',
  'Save income {amount}': 'Guardar ingreso {amount}',
  'Save {amount}': 'Guardar {amount}',
  'Where from': 'De dónde',
  'Possibly already logged': 'Puede que ya esté registrado',
  'You already have {amount} for {category} on {date}. Add it anyway?':
    'Ya tienes {amount} en {category} el {date}. ¿Lo añades igual?',
  'Cancel': 'Cancelar',
  'Add anyway': 'Añadir igual',

  // Movements
  'Shared movements': 'Movimientos compartidos',
  'All movements': 'Todos los movimientos',
  '{n} entries · shared only': '{n} movimientos · solo compartidos',
  '{n} entries': '{n} movimientos',
  'All': 'Todos',
  'Out': 'Salidas',
  'In': 'Entradas',
  'Both': 'Ambos',
  'You': 'Tú',
  'Loading…': 'Cargando…',
  'Nothing matches.': 'No hay coincidencias.',

  // Bottom nav
  'Home': 'Inicio',
  'Together': 'Juntos',
  'Add': 'Añadir',
  'Wealth': 'Patrimonio',
  'Analytics': 'Análisis',

  // Top bar
  'Back': 'Atrás',

  // Movement detail
  'When': 'Cuándo',
  'Category': 'Categoría',
  'Type': 'Tipo',
  'Shared': 'Compartido',
  'Business': 'Negocio',
  'Private': 'Privado',
  'Need or treat': 'Necesidad o capricho',
  'Treat': 'Capricho',
  'Need': 'Necesidad',
  'Account': 'Cuenta',
  'Paid by': 'Pagado por',
  'Owed back': 'Te deben',
  'What was in it': 'Qué incluía',
  '🧾 Receipt': '🧾 Recibo',
  'Edit': 'Editar',

  // Alerts
  '{n} alerts': '{n} avisos',
  'Alerts': 'Avisos',
  'Worth knowing': 'Conviene saber',
  'Mark all seen': 'Marcar todo como visto',
  'Nothing needs you right now.': 'Nada requiere tu atención ahora.',
  'Seen': 'Visto',
  'Close': 'Cerrar',
  // Same English word, different Spanish: the Add screen's type toggle picks
  // one entry (singular), the Home card totals many (plural).
  'mode|Expense': 'Gasto',
  'mode|Income': 'Ingreso',
  'Language': 'Idioma',
  'Your categories and anything you typed yourself stay as you wrote them.':
    'Tus categorías y todo lo que hayas escrito se quedan tal cual.',

  // Analytics
  'Mine': 'Mío',
  'Needs': 'Necesidades',
  'Treats': 'Caprichos',
  'needs': 'necesidades',
  'treats': 'caprichos',
  'total': 'total',
  'What you had to spend, together': 'Lo que habéis tenido que gastar, juntos',
  'What you chose to spend, together': 'Lo que habéis elegido gastar, juntos',
  'Where it went': 'A dónde ha ido',
  'Income by source': 'Ingresos por origen',
  'Expenses by category': 'Gastos por categoría',
  'Nothing here for {month}.': 'Nada por aquí en {month}.',
  "Past last month's {prev}": 'Ya por encima de los {prev} del mes pasado',
  "{left} left before last month's {prev}": 'Te quedan {left} antes de los {prev} del mes pasado',
  'Shared budgets': 'Presupuestos compartidos',
  'Your budgets': 'Tus presupuestos',
  'Both of you see these': 'Los veis los dos',
  'Only you see these': 'Solo los ves tú',
  'No limits set for shared spending yet.': 'Aún no hay límites para el gasto compartido.',
  'No limits set for your private spending yet.': 'Aún no hay límites para tu gasto privado.',
  '{amount} over': '{amount} de más',
  '{amount} left': 'Quedan {amount}',
  'Every month': 'Cada mes',
  'Nothing repeating here yet. Tick “Repeats monthly” when you add something.':
    'Aún no hay nada recurrente. Marca “Se repite cada mes” cuando añadas algo.',
  'Monthly': 'Mensual',
  'Manage →': 'Gestionar →',
  'Last 6 months': 'Últimos 6 meses',
  '{pct}% of {month}': '{pct}% de {month}',

  // Together
  'What the two of you spend': 'Lo que gastáis los dos',
  'Analysis': 'Análisis',
  'Spent together': 'Gastado juntos',
  'All square': 'En paz',
  'owes': 'debe a',
  'I paid this': 'Ya lo he pagado',
  'Mark as received': 'Marcar como recibido',
  'Paid from': 'Pagado desde',
  'Received into': 'Recibido en',
  "{name} picks their own account, so neither of you sees the other's balance.":
    '{name} elige su propia cuenta, así ninguno ve el saldo del otro.',
  'Confirm': 'Confirmar',
  'Recent together': 'Reciente juntos',
  'Nothing shared in {month} yet.': 'Aún no hay nada compartido en {month}.',
  'What you had to spend, together.': 'Lo que habéis tenido que gastar, juntos.',
  'What you chose to spend, together.': 'Lo que habéis elegido gastar, juntos.',
  'Nothing here yet in {month}.': 'Aún no hay nada en {month}.',
  '{pct}% of needs': '{pct}% de las necesidades',
  '{pct}% of treats': '{pct}% de los caprichos',

  // Wealth
  'Main account': 'Cuenta principal',
  'Savings account': 'Cuenta de ahorro',
  'Cash': 'Efectivo',
  'Card': 'Tarjeta',
  'Asset': 'Activo',
  'Week': 'Semana',
  'Month': 'Mes',
  '1Y': '1A',
  'Show amounts': 'Mostrar importes',
  'Hide amounts': 'Ocultar importes',
  'Net worth': 'Patrimonio neto',
  'Tap to close': 'Toca para cerrar',
  'Tap to see what it’s made of': 'Toca para ver de qué se compone',
  'The chart fills in day by day from today — check back tomorrow.':
    'El gráfico se va rellenando día a día desde hoy: vuelve mañana.',
  "What it's made of": 'De qué se compone',
  'selected': 'seleccionado',
  'held': 'en cartera',
  'Showing one holding — tap it again for all.':
    'Mostrando una posición: tócala otra vez para verlas todas.',
  '{n} account': '{n} cuenta',
  '{n} accounts': '{n} cuentas',
  '{n} position': '{n} posición',
  '{n} positions': '{n} posiciones',
  '{n} owed': '{n} pendientes',
  'No debts': 'Sin deudas',
  'Nothing yet': 'Nada aún',
  'Nothing yet.': 'Nada aún.',
  'Assets': 'Activos',
  'Debts': 'Deudas',
  'Savings': 'Ahorro',
  'Tax': 'Impuestos',
  'Simulators': 'Simuladores',
  'Asset values are whatever you last typed — nothing here tracks live prices.':
    'El valor de los activos es el último que escribiste: aquí nada sigue precios en directo.',
  '+ Add an asset': '+ Añadir un activo',
  'Add to net worth': 'Añadir al patrimonio',
  'Cash savings': 'Ahorro en efectivo',
  'Money set aside in a bank': 'Dinero apartado en un banco',
  'Money you hold yourself': 'Dinero que guardas tú',
  'Stocks': 'Acciones',
  'A holding you top up': 'Una posición que vas ampliando',
  'Give it a name.': 'Ponle un nombre.',
  'Could not save.': 'No se ha podido guardar.',
  'Name': 'Nombre',
  'e.g. S&P 500 fund': 'p. ej. fondo S&P 500',
  'e.g. Cash at home': 'p. ej. Efectivo en casa',
  'e.g. Santander savings': 'p. ej. Ahorro Santander',
  'Ticker (optional)': 'Ticker (opcional)',
  'e.g. VUAA': 'p. ej. VUAA',
  'What it is worth today': 'Cuánto vale hoy',
  'Balance today': 'Saldo hoy',
  'Update value': 'Actualizar valor',
  'Save': 'Guardar',
  'Remove “{name}” from your net worth?': '¿Quitar “{name}” de tu patrimonio?',
  'Keep it': 'Conservar',
  'Remove': 'Quitar',

  // Budget editor
  'Set shared limits': 'Fijar límites compartidos',
  'Set personal limits': 'Fijar límites personales',
  'Shared limits': 'Límites compartidos',
  'Personal limits': 'Límites personales',
  'Log something first, then you can cap it.': 'Registra algo primero y luego podrás ponerle un límite.',
  'Every category paid for this month — cap what matters, leave the rest at 0.':
    'Todas las categorías pagadas este mes: limita las que importan y deja el resto en 0.',
  'Done': 'Hecho',

  // Lists & charts
  'Has a receipt': 'Tiene recibo',
  'Monthly spending trend': 'Evolución del gasto mensual',
  'Dashed line = {avg} monthly average': 'Línea discontinua = media mensual de {avg}',

  // Coach insights
  '{cat} is up {pct}% vs last month ({now} vs {prev}).':
    '{cat} sube un {pct}% respecto al mes pasado ({now} frente a {prev}).',
  'Over budget on {cat}: {now} of {limit}.': 'Presupuesto superado en {cat}: {now} de {limit}.',
  'Treats are {pct}% of spending — a good place to trim to save more.':
    'Los caprichos son el {pct}% del gasto: un buen sitio para recortar y ahorrar más.',
  'Nice discipline — treats are only {pct}% of spending.':
    'Buena disciplina: los caprichos solo son el {pct}% del gasto.',
  '{category} has climbed 3 months running ({trail}).': '{category} sube 3 meses seguidos ({trail}).',
  'Nice — {category} is down 3 months running ({trail}). Keep it up! 🎉':
    'Bien: {category} baja 3 meses seguidos ({trail}). ¡Sigue así! 🎉',
  '{category} was {amount} last month — {pct}% above your usual {usual}.':
    '{category} fue {amount} el mes pasado: un {pct}% por encima de tu media de {usual}.',
  'You have about {headroom} of unused budget so far this month. Move {move} toward “{goal}” ({saved} / {target})?':
    'Llevas unos {headroom} de presupuesto sin usar este mes. ¿Mueves {move} a “{goal}” ({saved} / {target})?',
  'Add to savings →': 'Añadir al ahorro →',
  'You have about {headroom} of unused budget so far this month. Set a savings goal and put it to work.':
    'Llevas unos {headroom} de presupuesto sin usar este mes. Crea una meta de ahorro y ponlo a trabajar.',
  'Create a goal →': 'Crear una meta →',

  // Settings
  'Something went wrong.': 'Algo ha salido mal.',
  'Settings': 'Ajustes',
  'Appearance': 'Apariencia',
  '☀️ Light': '☀️ Claro',
  '🌙 Dark': '🌙 Oscuro',
  '📱 Auto': '📱 Auto',
  'Auto follows your phone, including when it switches at sunset.':
    'Auto sigue a tu móvil, incluido el cambio al anochecer.',
  'Currency': 'Moneda',
  'Changes the symbol shown throughout the app. Amounts already saved keep their number — nothing is converted at an exchange rate.':
    'Cambia el símbolo que se muestra en toda la app. Los importes ya guardados mantienen su número: no se convierte nada a ningún tipo de cambio.',
  'I own a business': 'Tengo un negocio',
  'Adds a Business zone and its tax estimate': 'Añade la zona Negocio y su estimación de impuestos',
  'Rent, subscriptions and important dates': 'Alquiler, suscripciones y fechas importantes',
  'Categories': 'Categorías',
  'Rename, recolour, add subcategories': 'Renombra, cambia el color, añade subcategorías',
  'Log faster': 'Registrar más rápido',
  'Apple Pay auto-log, Siri, home-screen icons': 'Registro automático con Apple Pay, Siri, iconos en el inicio',
  '🔔 Daily reminder': '🔔 Recordatorio diario',
  'Not supported in this browser. On iPhone: add Duo Budget to your home screen first (Share → Add to Home Screen), then open it from there.':
    'No compatible con este navegador. En iPhone: añade Duo Budget a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrelo desde ahí.',
  'A real notification that opens the app when you tap it — unlike a Shortcuts alert.':
    'Una notificación de verdad que abre la app al tocarla, a diferencia de un aviso de Atajos.',
  'Reminders on': 'Recordatorios activados',
  'Turn on reminders': 'Activar recordatorios',
  'Remind me at': 'Recuérdamelo a las',
  'Share this code so your partner can join:': 'Comparte este código para que tu pareja se una:',
  'Copied!': '¡Copiado!',
  'Copy': 'Copiar',
  '{name} (you)': '{name} (tú)',
  'Category limits': 'Límites por categoría',
  'Now in Analytics, split into shared and personal': 'Ahora en Análisis, separados en compartidos y personales',
  'Sign out': 'Cerrar sesión',

  // Savings
  'Private to you': 'Solo tuyo',
  'New goal': 'Nueva meta',
  'New savings goal': 'Nueva meta de ahorro',
  'Goal name': 'Nombre de la meta',
  'e.g. Trip to Italy': 'p. ej. Viaje a Italia',
  'Target (€)': 'Objetivo (€)',
  'Target date (optional)': 'Fecha objetivo (opcional)',
  'Set a date to see how much to save each month.': 'Pon una fecha para ver cuánto ahorrar cada mes.',
  '🐷 Saving': '🐷 Ahorro',
  '📈 Investment': '📈 Inversión',
  "Who's it for?": '¿Para quién es?',
  '🔒 Just me': '🔒 Solo yo',
  '👫 Shared': '👫 Compartida',
  'Create goal': 'Crear meta',
  'No goals yet': 'Aún no hay metas',
  'Create one to start saving toward something.': 'Crea una y empieza a ahorrar para algo.',
  '🐷 Savings': '🐷 Ahorro',
  '📈 Investments': '📈 Inversiones',
  'Target date reached': 'Fecha objetivo alcanzada',
  'Less than a month left': 'Queda menos de un mes',
  '{n} months left': 'Quedan {n} meses',
  '{n} month left': 'Queda {n} mes',
  '{n} yrs': '{n} años',
  '{n} yr': '{n} año',
  '{years} {n} mo left': 'Quedan {years} y {n} m',
  '{years} left': 'Quedan {years}',
  '🔒 Private': '🔒 Privada',
  '{a} of {b}': '{a} de {b}',
  '· reached! 🎉': '· ¡conseguida! 🎉',
  'Delete goal': 'Eliminar meta',
  '⏰ Past target date': '⏰ Fecha objetivo pasada',
  'Save {v}/mo': 'Ahorra {v}/mes',
  'Add contribution €': 'Añadir aportación €',
  'Tip: use a negative number to record a withdrawal.':
    'Truco: usa un número negativo para registrar una retirada.',

  // Business tax
  'Amount (EUR)': 'Importe (EUR)',
  '% Deductible': '% deducible',
  'Deductible amount (EUR)': 'Importe deducible (EUR)',
  'Note': 'Nota',
  'Business tax': 'Impuestos del negocio',
  'Autónomo · Madrid · {year} projection': 'Autónomo · Madrid · previsión {year}',
  'Projected net in your pocket this year': 'Previsión de lo que te queda limpio este año',
  'Est. income tax (IRPF)': 'IRPF estimado',
  'Effective rate': 'Tipo efectivo',
  'Your numbers': 'Tus cifras',
  'Expected annual revenue (€)': 'Facturación anual prevista (€)',
  'e.g. 60000': 'p. ej. 60000',
  'Social security / month (€)': 'Seguridad Social / mes (€)',
  'e.g. 300': 'p. ej. 300',
  'Accountant / year (€)': 'Gestor / año (€)',
  'e.g. 600': 'p. ej. 600',
  'Other deductible expenses / year (€)': 'Otros gastos deducibles / año (€)',
  'Business expenses logged so far': 'Gastos del negocio registrados hasta ahora',
  '→ of which deductible': '→ de los cuales deducibles',
  '→ deductible, projected for full year': '→ deducibles, previsión para todo el año',
  'Saved ✓': 'Guardado ✓',
  'Projected year': 'Año previsto',
  'Revenue': 'Facturación',
  '− Deductible business expenses': '− Gastos deducibles del negocio',
  '− Social security': '− Seguridad Social',
  '− Accountant': '− Gestor',
  '− Other deductibles': '− Otros deducibles',
  '= Taxable profit': '= Beneficio imponible',
  '− Estimated IRPF': '− IRPF estimado',
  '= Net in your pocket': '= Limpio para ti',
  '💡 What this means': '💡 Qué significa esto',
  'Your deductions cut your tax by about': 'Tus deducciones te ahorran unos',
  'this year.': 'de impuestos este año.',
  'Every extra €100 of legitimate business expense saves you':
    'Cada 100 € más de gasto legítimo del negocio te ahorra',
  'in tax (your {pct}% marginal rate).': 'en impuestos (tu tipo marginal del {pct}%).',
  'Set aside roughly': 'Aparta unos',
  'for IRPF plus {v} for social security across the year.':
    'para el IRPF más {v} para la Seguridad Social a lo largo del año.',
  'for IRPF across the year.': 'para el IRPF a lo largo del año.',
  'Deductible % by category': '% deducible por categoría',
  'Set what your gestor says is deductible per category — defaults to 100%. This is documentation, not tax advice.':
    'Indica lo que tu gestor considera deducible en cada categoría; por defecto es el 100%. Esto es documentación, no asesoramiento fiscal.',
  '⬇︎ Export business expenses for gestor (CSV)': '⬇︎ Exportar gastos del negocio para el gestor (CSV)',
  '⚠️ Projection for planning only — not official tax advice. Uses approximate combined state + Madrid IRPF brackets, treats social security as deductible, and extrapolates your logged expenses to a full year. Confirm real figures with your gestor.':
    '⚠️ Previsión solo para planificar, no es asesoramiento fiscal oficial. Usa tramos aproximados de IRPF estatal + Madrid, trata la Seguridad Social como deducible y extrapola a todo el año los gastos que has registrado. Confirma las cifras reales con tu gestor.',
  '{a} logged · {b} deductible': '{a} registrados · {b} deducibles',

  // Simulators
  'Loan': 'Préstamo',
  'Payment and total interest': 'Cuota e intereses totales',
  'Car': 'Coche',
  'Can you afford it?': '¿Te lo puedes permitir?',
  'House': 'Casa',
  'Mortgage and deposit': 'Hipoteca y entrada',
  'Retirement': 'Jubilación',
  'Your FIRE number': 'Tu número FIRE',
  'Invest monthly': 'Invertir cada mes',
  'Compound interest': 'Interés compuesto',
  'Refinancing': 'Refinanciación',
  'Is it worth switching?': '¿Merece la pena cambiar?',
  'Inflation': 'Inflación',
  'Your money in X years': 'Tu dinero dentro de X años',
  'Explore before deciding': 'Explora antes de decidir',
  "These are plain calculators — they don't read or change anything you've logged, and none of it is financial advice.":
    'Son calculadoras sin más: no leen ni cambian nada de lo que has registrado, y nada de esto es asesoramiento financiero.',
  'Amount borrowed': 'Importe prestado',
  'Interest rate': 'Tipo de interés',
  '% a year': '% al año',
  'Over': 'En',
  'years': 'años',
  'Payments': 'Cuotas',
  'Total repaid': 'Total devuelto',
  'Of which interest': 'De los cuales intereses',
  'Price': 'Precio',
  'Deposit': 'Entrada',
  'Running costs': 'Gastos de uso',
  '€/month': '€/mes',
  'Your monthly income': 'Tus ingresos mensuales',
  'All in, every month': 'Todo incluido, cada mes',
  'Finance': 'Financiación',
  'Share of income': 'Sobre tus ingresos',
  'Total interest': 'Intereses totales',
  "That's {pct}% of your income going on one car. Comfortable is usually under 15–20%.":
    'Eso es el {pct}% de tus ingresos en un solo coche. Lo cómodo suele ser menos del 15–20%.',
  '{pct}% of your income — within the range most people find comfortable.':
    '{pct}% de tus ingresos: dentro de lo que la mayoría considera cómodo.',
  'Mortgage each month': 'Hipoteca al mes',
  'Taxes & fees (~11%)': 'Impuestos y gastos (~11%)',
  'Cash needed upfront': 'Dinero necesario al inicio',
  'Borrowed': 'Financiado',
  'Fees are a rough 11% for Spain — transfer tax, notary and registry vary by region and by whether the place is new or resale. Ask your gestor for the real figure.':
    'Los gastos son un 11% aproximado para España: el ITP, la notaría y el registro varían según la comunidad y según si la vivienda es nueva o de segunda mano. Pregunta a tu gestor la cifra real.',
  "What you'd spend a month": 'Lo que gastarías al mes',
  'Safe withdrawal rate': 'Tasa de retirada segura',
  'Saving each month': 'Ahorro cada mes',
  'Already invested': 'Ya invertido',
  'Expected return': 'Rentabilidad esperada',
  'You would need': 'Necesitarías',
  'At this pace': 'A este ritmo',
  'Never at this rate': 'Nunca a este ritmo',
  '{n} years': '{n} años',
  'Yearly spending': 'Gasto anual',
  'Investing each month': 'Invirtiendo cada mes',
  'Starting with': 'Empezando con',
  'For': 'Durante',
  'After {n} years': 'Dentro de {n} años',
  'You put in': 'Has puesto',
  'Growth': 'Crecimiento',
  "A steady return is an assumption, not a promise — real markets don't move in a straight line.":
    'Una rentabilidad constante es una suposición, no una promesa: los mercados reales no van en línea recta.',
  'Outstanding balance': 'Capital pendiente',
  'Current rate': 'Tipo actual',
  'New rate': 'Tipo nuevo',
  'Years left': 'Años que quedan',
  'Cost to switch': 'Coste de cambiar',
  'Saved every month': 'Ahorrado al mes',
  'Extra every month': 'De más al mes',
  'Now': 'Ahora',
  'After switching': 'Tras el cambio',
  'Pays for itself in': 'Se amortiza en',
  'Never — it costs more': 'Nunca: sale más caro',
  '{n} months': '{n} meses',
  'Over the full term': 'En todo el plazo',
  'Amount today': 'Importe hoy',
  'That is': 'Es decir',
  'Buys what {v} buys today': 'Compra lo que hoy compran {v}',
  'Purchasing power lost': 'Poder adquisitivo perdido',

  // Accounts
  'Accounts': 'Cuentas',
  'Yours only — nobody else sees these': 'Solo tuyas: nadie más las ve',
  'Total across your accounts': 'Total en tus cuentas',
  'Bank': 'Banco',
  '{kind} · default': '{kind} · por defecto',
  '+ Add account': '+ Añadir cuenta',
  'Closed': 'Cerradas',
  'Reopen': 'Reabrir',
  'e.g. Santander': 'p. ej. Santander',
  'Balance right now': 'Saldo ahora mismo',
  "What's in it today. Everything you log from here on adjusts it.":
    'Lo que tiene hoy. Todo lo que registres a partir de ahora lo ajusta.',
  'Edit account': 'Editar cuenta',
  'Starting balance': 'Saldo inicial',
  'Close this account': 'Cerrar esta cuenta',
  'Delete “{name}”? What you spent from it stays in your history — those entries just stop pointing at an account.':
    '¿Eliminar “{name}”? Lo que gastaste desde ella sigue en tu historial: esos movimientos simplemente dejan de apuntar a una cuenta.',
  'Delete account': 'Eliminar cuenta',

  // Every month (recurring)
  'Rent, subscriptions, anything regular': 'Alquiler, suscripciones, cualquier cosa periódica',
  'Enter a name and an amount.': 'Pon un nombre y un importe.',
  'e.g. Netflix': 'p. ej. Netflix',
  '🤝 Shared': '🤝 Compartido',
  '👤 Private': '👤 Privado',
  'Add monthly expense': 'Añadir gasto mensual',
  'You can also check "Repeats monthly" right on the Add Expense screen — this does the same thing.':
    'También puedes marcar "Se repite cada mes" en la pantalla de añadir gasto: hace lo mismo.',
  'Monthly expenses': 'Gastos mensuales',
  'Monthly income': 'Ingresos mensuales',
  'Add these from the Add screen. Your fixed salary is the exception — it belongs only in':
    'Añádelos desde la pantalla Añadir. Tu nómina fija es la excepción: va solo en',
  'Salary': 'Nómina',
  ', so if one of these is your salary, remove it here or it gets counted twice.':
    ', así que si alguno de estos es tu nómina, quítalo de aquí o se contará dos veces.',
  'Nothing repeating yet': 'Aún no hay nada recurrente',
  "Rent, the gym, Netflix — add them here and they'll count every month on their own.":
    'El alquiler, el gimnasio, Netflix: añádelos aquí y contarán cada mes solos.',
  'From before': 'De antes',
  'These were switched off so you could set this up fresh. Nothing was lost — tap to bring one back.':
    'Se desactivaron para que lo configuraras de cero. No se ha perdido nada: toca para recuperar uno.',
  '{v}/mo': '{v}/mes',
  'Add back': 'Recuperar',
  'Delete {name}': 'Eliminar {name}',
  'Rename': 'Renombrar',
  'Toggle active': 'Activar o desactivar',

  // Upcoming
  'Upcoming': 'Próximos',
  'The next three months': 'Los próximos tres meses',
  'Going out': 'Sale',
  'Coming in': 'Entra',
  "Nothing scheduled. Add a recurring charge and it'll show up here.":
    'Nada programado. Añade un cargo recurrente y aparecerá aquí.',
  'Next 7 days': 'Próximos 7 días',
  'Rest of the month': 'Resto del mes',
  'Later': 'Más adelante',

  // Profile
  'Your name': 'Tu nombre',
  'Your household': 'Tu hogar',
  'Partner': 'Pareja',
  'Share this code so someone can join:': 'Comparte este código para que alguien se una:',
  'Appearance, categories, reminders': 'Apariencia, categorías, recordatorios',
  'Use at least 8 characters.': 'Usa al menos 8 caracteres.',
  "Those two don't match.": 'No coinciden.',
  'Password changed.': 'Contraseña cambiada.',
  'Change password': 'Cambiar contraseña',
  'For this account': 'De esta cuenta',
  'New password': 'Nueva contraseña',
  'Again': 'Repítela',
  'Change': 'Cambiar',

  // Scan receipt
  'Could not read the receipt. Try a clearer, well-lit photo.':
    'No se ha podido leer el recibo. Prueba con una foto más nítida y bien iluminada.',
  'Expense saved, but the receipt image could not be stored.':
    'Gasto guardado, pero no se ha podido guardar la imagen del recibo.',
  'Share sheet opened — pick Dropbox to save it.':
    'Se ha abierto el menú de compartir: elige Dropbox para guardarlo.',
  'Sharing isn’t supported here — image downloaded instead.':
    'Aquí no se puede compartir: se ha descargado la imagen.',
  'Couldn’t open the share sheet.': 'No se ha podido abrir el menú de compartir.',
  'Snap a receipt': 'Haz una foto al recibo',
  "We'll read the total automatically": 'Leeremos el total automáticamente',
  'receipt': 'recibo',
  'Reading receipt…': 'Leyendo el recibo…',
  'Detected total': 'Total detectado',
  "Couldn't detect a total — please type it in.": 'No se ha detectado un total: escríbelo tú.',
  'Detected date: {d}': 'Fecha detectada: {d}',
  'Need or treat?': '¿Necesidad o capricho?',
  'Category — guessed {emoji}': 'Categoría — sugerida {emoji}',
  'Items ({n} found)': 'Artículos ({n} encontrados)',
  'Items — none detected, add them below': 'Artículos — no se ha detectado ninguno, añádelos abajo',
  'e.g. dentist, haircut, massage': 'p. ej. dentista, peluquería, masaje',
  'Filled in from the receipt — change it if you prefer.':
    'Rellenado desde el recibo: cámbialo si quieres.',
  'Also used as the filename when you save to Dropbox.':
    'También se usa como nombre del archivo al guardar en Dropbox.',
  'What the scan read (tap to view / send me)': 'Lo que ha leído el escáner (toca para verlo / enviármelo)',
  '⚠️ Possible duplicate — {v} for {cat} on {d} is already logged.':
    '⚠️ Posible duplicado: ya hay {v} en {cat} el {d}.',
  'Save invoice to Dropbox': 'Guardar factura en Dropbox',
  'Edit details': 'Editar detalles',
  'Confirm {v}': 'Confirmar {v}',
  'Retake': 'Repetir foto',

  // Grocery selector
  'What did you buy? (optional)': '¿Qué has comprado? (opcional)',
  'Search items… e.g. shampoo': 'Buscar artículos… p. ej. champú',
  '+ Add “{q}”': '+ Añadir “{q}”',
  'Items total:': 'Total de artículos:',
  'Use as amount →': 'Usar como importe →',

  // Category sheet
  'Search…': 'Buscar…',
  'Nothing matches “{q}”.': 'No hay coincidencias con “{q}”.',
  // "In 10 years", not the Movements "In" (incoming) filter.
  'duration|In': 'Dentro de',

  // Login / sign up
  'Track spending together, save apart.': 'Controlad los gastos juntos, ahorrad por separado.',
  'e.g. Alex': 'p. ej. Alex',
  'Email': 'Correo',
  'Password': 'Contraseña',
  'Please wait…': 'Un momento…',
  'Create account': 'Crear cuenta',
  'Sign in': 'Iniciar sesión',
  'New here? Create an account': '¿Nuevo por aquí? Crea una cuenta',
  'Already have an account? Sign in': '¿Ya tienes cuenta? Inicia sesión',
  'Account created! Check your email if confirmation is on, then sign in.':
    '¡Cuenta creada! Revisa tu correo si la confirmación está activada y luego inicia sesión.',

  // Onboarding
  'Our Household': 'Nuestra casa',
  'Hi {name} 👋': 'Hola, {name} 👋',
  'Set up your shared space to start tracking together.':
    'Configura vuestro espacio compartido para empezar a controlar los gastos juntos.',
  'Create': 'Crear',
  'Join': 'Unirse',
  'Household name': 'Nombre de la casa',
  'Create household': 'Crear casa',
  "You'll get an invite code to share with your partner so they can join.":
    'Recibirás un código de invitación para compartir con tu pareja y que pueda unirse.',
  'Invite code': 'Código de invitación',
  'Join household': 'Unirse a una casa',

  // Reset password
  'Password must be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  "Passwords don't match.": 'Las contraseñas no coinciden.',
  'Set a new password': 'Cambiar la contraseña',
  'Choose a new password for your account.': 'Elige una contraseña nueva para tu cuenta.',
  'Confirm password': 'Confirmar contraseña',
  'Save new password': 'Guardar contraseña',

  // Every month (plan)
  'What goes out before you spend a thing': 'Lo que sale antes de gastar nada',
  '{n} active · {amount} a month': '{n} activos · {amount} al mes',
  'Nothing repeating yet — add rent and subscriptions here':
    'Aún no hay nada recurrente: añade aquí el alquiler y las suscripciones',
  'Important dates': 'Fechas importantes',
  '{title} in 1 day': '{title} dentro de 1 día',
  '{title} in {n} days': '{title} dentro de {n} días',
  'Nothing coming up': 'Nada a la vista',

  // Salary
  'Your fixed monthly income': 'Tu ingreso fijo mensual',
  'Monthly salary': 'Nómina mensual',
  'What lands in your account every month, before anything extra. Change it here whenever it changes.':
    'Lo que entra en tu cuenta cada mes, antes de cualquier extra. Cámbialo aquí cuando cambie.',
  'e.g. 2200': 'p. ej. 2200',
  'Currently counted as {amount} every month.': 'Ahora mismo cuenta como {amount} al mes.',
  'Got something extra?': '¿Has tenido un extra?',
  "A bonus, a freelance payment, a sale — those change month to month, so add them as income on the Add screen and they'll count only in the month they arrived.":
    'Una paga extra, un trabajo freelance, una venta: cambian mes a mes, así que añádelos como ingreso en la pantalla Añadir y contarán solo en el mes en que llegaron.',
  'Add income': 'Añadir ingreso',

  // Important dates
  'New date': 'Nueva fecha',
  'Plan ahead for birthdays, anniversaries and holidays — set a budget so gifts never blow the month. Only you can see these.':
    'Anticípate a cumpleaños, aniversarios y vacaciones: pon un presupuesto para que los regalos no te descuadren el mes. Solo tú puedes verlas.',
  'What is it?': '¿Qué es?',
  "e.g. Adi's birthday": 'p. ej. cumpleaños de Adi',
  'Budget (€)': 'Presupuesto (€)',
  'Repeats every year': 'Se repite cada año',
  'Add date': 'Añadir fecha',
  'No dates yet': 'Aún no hay fechas',
  'Add birthdays and holidays to plan for them.': 'Añade cumpleaños y vacaciones para planificarlos.',
  'Add a date': 'Añadir una fecha',
  'yearly': 'anual',
  'budget {amount}': 'presupuesto {amount}',
  'Today!': '¡Hoy!',
  '{n} days': '{n} días',

  // Categories
  'Shared with your partner': 'Compartidas con tu pareja',
  'Spending': 'Gastos',
  'Not counted as spending': 'No cuenta como gasto',
  'Add subcategory to {name}': 'Añadir subcategoría a {name}',
  'Turn off {name}': 'Desactivar {name}',
  'Turn on {name}': 'Activar {name}',
  '+ Add category': '+ Añadir categoría',
  'Renaming a category updates it everywhere. A subcategory always counts toward its parent in reports, so your monthly totals stay comparable.':
    'Al renombrar una categoría se actualiza en todas partes. Una subcategoría siempre suma a su categoría principal en los informes, así tus totales mensuales siguen siendo comparables.',
  'New subcategory under {name}': 'Nueva subcategoría en {name}',
  'New category': 'Nueva categoría',
  'Emoji': 'Emoji',
  'e.g. Gym': 'p. ej. Gimnasio',
  'e.g. Subscriptions': 'p. ej. Suscripciones',
  'Colour': 'Color',
  'Usually a': 'Normalmente es',
  'Edit category': 'Editar categoría',
  'Edit subcategory': 'Editar subcategoría',
  'Delete “{name}”?': '¿Eliminar “{name}”?',
  'Its 1 subcategory goes too.': 'Su subcategoría también se elimina.',
  'Its {n} subcategories go too.': 'Sus {n} subcategorías también se eliminan.',
  'Expenses already filed under it keep their history and their totals — they just stop pointing at a category you can pick again.':
    'Los gastos ya asignados conservan su historial y sus totales; simplemente dejan de apuntar a una categoría que puedas volver a elegir.',
  'Hide from the picker': 'Ocultar del selector',

  // Log faster (Shortcuts / Siri). The bolded fragments are Shortcuts action
  // names as they read on a Spanish iPhone, so the steps can be followed
  // literally; the surrounding prose is split around them.
  'Home-screen icons, Siri & reminders': 'Iconos en la pantalla de inicio, Siri y recordatorios',
  '📲 Home-screen shortcuts': '📲 Accesos en la pantalla de inicio',
  'The fastest way: put dedicated icons on your home screen that jump straight to Scan or Add.':
    'Lo más rápido: pon iconos en tu pantalla de inicio que abran directamente Escanear o Añadir.',
  '📸 Scan': '📸 Escanear',
  '➕ Quick add': '➕ Añadir rápido',
  'Tap': 'Toca',
  'above (opens the scan screen).': 'arriba (abre la pantalla de escaneo).',
  'In Safari tap': 'En Safari toca',
  'Share': 'Compartir',
  'Add to Home Screen': 'Añadir a pantalla de inicio',
  'name it “Scan”.': 'y llámalo “Escanear”.',
  'Repeat with': 'Repite con',
  'name it “Add”.': 'y llámalo “Añadir”.',
  'Now “Scan” opens the camera in one tap, and “Add” opens the numpad. (First open, sign in once — it stays logged in.)':
    'Ahora “Escanear” abre la cámara de un toque y “Añadir” abre el teclado numérico. (La primera vez inicia sesión una sola vez: se queda guardada.)',
  '💳 Auto-log every Apple Pay tap': '💳 Registra solo cada pago con Apple Pay',
  'iOS has a built-in automation trigger that fires on every physical Apple Pay tap (NFC only — not online checkouts) and hands you the amount and merchant with no typing at all. Only the category defaults generically; fix it later from the':
    'iOS tiene una automatización que se activa con cada pago físico con Apple Pay (solo NFC, no compras online) y te da el importe y el comercio sin escribir nada. Solo la categoría queda genérica; corrígela después desde la',
  'expenses list': 'lista de gastos',
  'if it matters.': 'si te importa.',
  'Shortcuts': 'Atajos',
  // Reads "Atajos app" after the bolded action name, the way the step lists
  // are stitched together; "app" is what a Spanish iPhone calls it anyway.
  'app': 'app',
  'iPhone': 'iPhone',
  'Automation': 'Automatización',
  'Create Personal Automation': 'Crear automatización personal',
  'search': 'busca',
  'Wallet': 'Cartera',
  'older iOS:': 'en iOS antiguo:',
  'Transaction': 'Transacción',
  'Select the card(s) to auto-log.': 'Elige la tarjeta o tarjetas que se registrarán solas.',
  'Do this once per card if they should default to different scopes':
    'Hazlo una vez por tarjeta si cada una debe ir a un ámbito distinto',
  '— e.g. a shared card → Shared, your own → Private.':
    '— p. ej. una tarjeta común → Compartido, la tuya → Privado.',
  'URL Encode': 'Codificar URL',
  'input: tap the field, scroll to': 'entrada: toca el campo, baja hasta',
  'Shortcut Input': 'Entrada del atajo',
  'pick': 'y elige',
  'Merchant': 'Comercio',
  'Text': 'Texto',
  'paste the base link below, then insert in order:':
    'pega el enlace base de abajo e inserta en orden:',
  'Shortcut Input → Amount': 'Entrada del atajo → Importe',
  'then the category/scope for this card, then the':
    'luego la categoría/ámbito de esta tarjeta y después el',
  'encoded merchant': 'comercio codificado',
  'as the note. It should read like:': 'como nota. Debería quedar así:',
  'Get Contents of URL': 'Obtener contenido de la URL',
  'that': 'ese',
  'text =': 'texto =',
  'Contents of URL': 'Contenido de la URL',
  '— confirms what was logged, or shows the error, without opening anything.':
    '— confirma lo registrado, o muestra el error, sin abrir nada.',
  'Turn off': 'Desactiva',
  'Ask Before Running': 'Preguntar antes de ejecutar',
  'and': 'y',
  'Notify When Run': 'Notificar al ejecutar',
  'Show Notification': 'Mostrar notificación',
  'Name it after the card, e.g. “Log — Joint card”.':
    'Ponle el nombre de la tarjeta, p. ej. “Registrar — Tarjeta común”.',
  "Apple's own trigger occasionally times out on the first few taps while it settles — this is a known Shortcuts quirk, not a Duo Budget problem. If a tap doesn't log, add it manually; nothing is lost.":
    'La automatización de Apple a veces falla en los primeros pagos mientras se asienta: es una rareza conocida de Atajos, no un problema de Duo Budget. Si un pago no se registra, añádelo a mano; no se pierde nada.',
  'Time of Day': 'Hora del día',
  'e.g. 21:00, Daily.': 'p. ej. 21:00, cada día.',
  'Action': 'Acción',
  "“💸 Log today's spending”.": '“💸 Registra los gastos de hoy”.',
  'Turn off “Ask Before Running”.': 'Desactiva “Preguntar antes de ejecutar”.',
  "Note: this is a plain iOS notification — tapping it opens Shortcuts, not Duo Budget (this isn't a native app, so iOS won't deep-link a tap into it). It's a nudge to open the app yourself, not a shortcut into it.":
    'Nota: es una notificación normal de iOS; al tocarla se abre Atajos, no Duo Budget (esto no es una app nativa, así que iOS no puede enlazar dentro de ella). Es un aviso para que abras tú la app, no un acceso directo.',
  '🎙️ Siri: “Log expense” (asks everything)': '🎙️ Siri: “Registrar gasto” (te pregunta todo)',
  'One shortcut Siri can ask you about each time — how much, what for, shared or private:':
    'Un atajo que Siri te pregunta cada vez: cuánto, para qué, compartido o privado:',
  'add': 'añade',
  'Ask for Input': 'Pedir entrada',
  'type': 'tipo',
  'Number': 'Número',
  'prompt “How much?”).': 'pregunta “¿Cuánto?”).',
  'again': 'otra vez',
  "prompt “What's it for?”) — say anything, e.g. “coffee”, “taxi”.":
    'pregunta “¿Para qué?”) — di lo que sea, p. ej. “café”, “taxi”.',
  'Choose from Menu': 'Elegir del menú',
  'prompt “Shared or private?”, menu items':
    'pregunta “¿Compartido o privado?”, opciones del menú',
  'In each branch add a': 'En cada rama añade una acción',
  'action with just that word': 'con solo esa palabra',
  '— this becomes the result after the menu.': '— esto será el resultado tras el menú.',
  'input: the category': 'entrada: la variable de categoría',
  "variable (so spaces/accents don't break the link).":
    '(para que los espacios y las tildes no rompan el enlace).',
  'build the link: paste the base link below, then insert variables in order —':
    'construye el enlace: pega el enlace base de abajo e inserta las variables en orden —',
  'then the': 'luego la',
  'encoded category': 'categoría codificada',
  'menu result': 'resultado del menú',
  '(scope). It should read like:': '(ámbito). Debería quedar así:',
  '(this shows “✅ Added” or the exact error — no more silent failures).':
    '(muestra “✅ Añadido” o el error exacto: se acabaron los fallos silenciosos).',
  'Name it “Log expense”, turn off “Ask Before Running”. Say “Hey Siri, Log expense”.':
    'Llámalo “Registrar gasto” y desactiva “Preguntar antes de ejecutar”. Di “Oye Siri, Registrar gasto”.',
  'Base link (build the full one above from this)':
    'Enlace base (monta con él el completo de arriba)',
  "🔒 Keep this link private — it's your personal logging key. Need vs treat defaults to “need”; edit it in the app after if it was a treat.":
    '🔒 No compartas este enlace: es tu clave personal de registro. Necesidad o capricho se pone como “necesidad”; cámbialo luego en la app si fue un capricho.',
  'Test it now (logs €1 “Test”, shows the real result) →':
    'Pruébalo ahora (registra 1 € “Test” y muestra el resultado real) →',
  '⚡ Or: one-word shortcuts per category': '⚡ O bien: atajos de una palabra por categoría',
  'Prefer speed over choice? Make a few of these instead — each only asks the amount:':
    '¿Prefieres velocidad a elegir? Crea varios de estos: cada uno solo pregunta el importe:',
  'type:': 'tipo:',
  'prompt “Amount?”).': 'pregunta “¿Importe?”).',
  'paste the link below, then insert the': 'pega el enlace de abajo e inserta la variable',
  'Provided Input': 'Entrada proporcionada',
  'variable at the very end.': 'justo al final.',
  'that Text.': 'ese Texto.',
  'Name it e.g. “Log groceries”. Say “Hey Siri, Log groceries”.':
    'Llámalo p. ej. “Registrar compra”. Di “Oye Siri, Registrar compra”.',
  'Your quick-add link (amount goes at the end)':
    'Tu enlace de añadido rápido (el importe va al final)',
  // "Cambia" (imperative) — Settings' own "Change" button is "Cambiar".
  'link|Change': 'Cambia',
  'in the link to make different shortcuts (e.g. “Log coffee”, “Log night out”).':
    'en el enlace para crear atajos distintos (p. ej. “Registrar café”, “Registrar salida”).',

  // Import bank statement
  "Couldn't find any rows in that file.": 'No se ha encontrado ninguna fila en ese archivo.',
  "Couldn't read that file. Export it as CSV from your bank and try again.":
    'No se ha podido leer ese archivo. Expórtalo como CSV desde tu banco e inténtalo de nuevo.',
  '{done} of {total} imported.': '{done} de {total} importados.',
  'Import statement': 'Importar extracto',
  'CSV from your bank': 'CSV de tu banco',
  'Choose a CSV file': 'Elige un archivo CSV',
  'Semicolons or commas, Spanish or English formats':
    'Con punto y coma o con comas, formato español o inglés',
  'Getting the file from Santander': 'Cómo sacar el archivo del Santander',
  "Online banking → your account → movements → export. Pick CSV rather than Excel or PDF; Excel files aren't readable here.":
    'Banca online → tu cuenta → movimientos → exportar. Elige CSV en vez de Excel o PDF; los archivos de Excel no se pueden leer aquí.',
  'Money coming in is ignored on purpose — salary and transfers are already handled properly elsewhere, and importing them as spending would distort every total.':
    'El dinero que entra se ignora a propósito: la nómina y las transferencias ya se gestionan en otro sitio, e importarlas como gasto distorsionaría todos los totales.',
  'Which column is which?': '¿Qué columna es cada una?',
  "Found {n} rows. Check these look right — change any that don't.":
    'Se han encontrado {n} filas. Comprueba que esto cuadra y cambia lo que no.',
  'column|date': 'fecha',
  'column|description': 'concepto',
  'column|amount': 'importe',
  '— none —': '— ninguna —',
  'Import into': 'Importar a',
  'Treat as': 'Tratar como',
  'Category for all of them': 'Categoría para todos',
  'One category for the batch — sort them properly afterwards from the expenses list.':
    'Una categoría para todo el lote; ordénalos bien después desde la lista de gastos.',
  'Preview 1 payment': 'Ver 1 pago',
  'Preview {n} payments': 'Ver {n} pagos',
  'No spending found with those columns — check the date and amount pickers.':
    'No se han encontrado gastos con esas columnas: revisa los selectores de fecha e importe.',
  'Selected': 'Seleccionados',
  "1 payment looks like one you already logged, so it's unticked. Tick one only if it's genuinely separate.":
    '1 pago se parece a uno que ya registraste, así que está desmarcado. Márcalo solo si es realmente otro.',
  "{n} payments look like ones you already logged, so they're unticked. Tick one only if it's genuinely separate.":
    '{n} pagos se parecen a otros que ya registraste, así que están desmarcados. Marca uno solo si es realmente otro.',
  'Already logged {date}': 'Ya registrado el {date}',
  'Importing…': 'Importando…',
  'Import {n}': 'Importar {n}',
  '{n} imported': '{n} importados',
  'Nothing imported': 'No se ha importado nada',
  'They all landed on one category — sort them from the expenses list.':
    'Han caído todos en una categoría; ordénalos desde la lista de gastos.',
  'Everything in that file was already in the app.': 'Todo lo de ese archivo ya estaba en la app.',
  'See expenses': 'Ver gastos',

  // Grocery analysis
  'Spent on groceries': 'Gastado en la compra',
  '1 shop': '1 compra',
  '{n} shops': '{n} compras',
  '1 distinct item': '1 producto distinto',
  '{n} distinct items': '{n} productos distintos',
  'No itemised shops yet — scan a grocery receipt and its products will show up here.':
    'Aún no hay compras detalladas: escanea un ticket del súper y sus productos aparecerán aquí.',
  'What you bought': 'Qué has comprado',
  "+{amount} from shops that weren't itemised.": '+{amount} de compras sin detallar.',

  // Install prompt
  'Install Duo Budget': 'Instalar Duo Budget',
  'then': 'y luego',
  '— it opens full-screen like a normal app.': '— se abre a pantalla completa como una app normal.',
  'Add it to your home screen for a full-screen, offline app.':
    'Añádela a tu pantalla de inicio para tenerla a pantalla completa y sin conexión.',
  'Dismiss': 'Descartar',
  'Install app': 'Instalar app',

  // Receipt viewer
  'Loading receipt…': 'Cargando recibo…',
  'That receipt image could not be loaded.': 'No se ha podido cargar la imagen del recibo.',
  'Receipt': 'Recibo',

  // Settings / Profile grouped-list rebuild (2026-08-19)
  'Edit name': 'Editar nombre',
  'Household': 'Hogar',
  'Nobody has joined yet': 'Todavía no se ha unido nadie',
  'Send them the code above.': 'Mándale el código de arriba.',
  'Preferences': 'Preferencias',
  'Notifications': 'Notificaciones',
  'Daily reminder': 'Recordatorio diario',
  'Add Duo Budget to your home screen first, then open it from there.':
    'Añade Duo Budget a tu pantalla de inicio y ábrelo desde ahí.',
  'Coming payments, weekly summary and nudges.':
    'Pagos que vienen, resumen semanal y avisos.',
  'Adding a business gives you a Business zone and its tax estimate.':
    'Activar negocio añade la zona Negocio y su estimación de impuestos.',
  'Members': 'Miembros',

  // "Get to know you" intro questionnaire (2026-08-19)
  'Open': 'Abrir',
  'Tell me about your money': 'Cuéntame sobre tu dinero',
  'Five short questions so every screen has your real numbers in it.':
    'Cinco preguntas cortas y todas las pantallas tendrán tus números de verdad.',
  'Start →': 'Empezar →',
  'Cash and accounts': 'Efectivo y cuentas',
  'Investments': 'Inversiones',
  'Debts': 'Deudas',
  'Not now': 'Ahora no',
  'Getting to know you': 'Vamos a conocerte',
  'A few questions, then the app is yours': 'Unas preguntas y la app es tuya',
  'Five short answers and every screen has real numbers in it. You can skip any of them, and change all of them later.':
    'Cinco respuestas cortas y todas las pantallas tendrán números de verdad. Puedes saltarte cualquiera y cambiarlas todas después.',
  'Your accounts': 'Tus cuentas',
  'How much do you have right now?': '¿Cuánto tienes ahora mismo?',
  'What sits in your bank accounts and in cash. Investments and property come next.':
    'Lo que hay en tus cuentas del banco y en efectivo. Las inversiones y la vivienda vienen después.',
  'Your assets': 'Tus activos',
  'Any investments or property?': '¿Tienes inversiones o propiedades?',
  'Shares, funds, crypto, a flat — roughly what it is all worth today. Leave it empty if none.':
    'Acciones, fondos, cripto, un piso… más o menos lo que valen hoy. Déjalo vacío si no tienes.',
  'What you owe': 'Lo que debes',
  'Mortgage or loans?': '¿Hipoteca o préstamos?',
  'This counts too, and you are going to have it in view. Leave it empty if none.':
    'Esto también cuenta, y lo vas a tener controlado. Déjalo vacío si no tienes.',
  'Your monthly rhythm': 'Tu ritmo mensual',
  'How much comes in each month?': '¿Cuánto ingresas al mes?',
  'Salary and anything else regular. This is what "saved this month" is measured against.':
    'Nómina y cualquier otro ingreso fijo. Es la referencia de «ahorrado este mes».',
  'And roughly how much goes out?': '¿Y cuánto gastas al mes, más o menos?',
  'A rough number is fine — the app will learn the real one as you log things.':
    'Con un número aproximado vale — la app aprenderá el real a medida que apuntes cosas.',
  'That leaves about {v} a month.': 'Te quedan unos {v} al mes.',
  'Your net worth': 'Tu patrimonio',
  'And it updates itself from now on.': 'Y se actualiza solo a partir de ahora.',
  'Keeping this pace': 'A este ritmo',
  'In three years, saving {v} a month. Simple arithmetic — no investment growth assumed.':
    'En tres años, ahorrando {v} al mes. Cuentas simples — sin suponer rentabilidad.',
  'Start using it': 'Empezar a usarla',
  'Let’s go': 'Vamos',
  'Continue': 'Continuar',

  // Intro questionnaire, rebuilt around a running net-worth total (2026-08-19)
  'Five minutes now, and every screen has your real numbers in it.':
    'Cinco minutos ahora y todas las pantallas tendrán tus números de verdad.',
  'You can skip any of them, and change all of them later.':
    'Puedes saltarte cualquiera y cambiarlas todas después.',
  'Now the important bit. Where do you keep your money?':
    'Vamos a lo importante. ¿Dónde guardas tu dinero?',
  'Bank, savings or cash. This is the first brick of your number.':
    'Banco, ahorros o efectivo. Es el primer ladrillo de tu número.',
  'Add another account': 'Añadir otra cuenta',
  'Add an account': 'Añadir cuenta',
  'And is any of it invested? Shares, funds, crypto…':
    '¿Y tienes algo invertido? Acciones, fondos, cripto…',
  'Shares, ETFs, crypto, a flat — anything that holds value.':
    'Acciones, ETFs, cripto, un piso… cualquier cosa que tenga valor.',
  'Add another asset': 'Añadir otro activo',
  'Add an asset': 'Añadir activo',
  'Now what you owe. This counts too, and you are going to have it in view.':
    'Ahora lo que debes. Esto también cuenta, y lo vas a tener controlado.',
  'Mortgage, loans, cards… add whatever you owe.':
    'Hipoteca, préstamos, tarjetas… añade lo que debas.',
  'Add another debt': 'Añadir otra deuda',
  'Add a debt': 'Añadir deuda',
  'Two numbers and I can show you where you are heading.':
    'Dos números y te enseño a dónde vas.',
  'Last stop: what comes in and what goes out?':
    'Última parada: ¿qué entra y qué sale cada mes?',
  'Salary and other income': 'Nómina y otros ingresos',
  'Save my salary as recurring income': 'Guardar mi nómina como ingreso recurrente',
  'One last thing, so I know when to expect it.':
    'Una última cosa, para saber cuándo esperarla.',
  'What day does it arrive?': '¿Qué día te llega?',
  'So "Coming up" knows when to expect it, instead of assuming the 1st.':
    'Así «Próximos» sabe cuándo esperarlo, en vez de suponer el día 1.',
  'In shorter months this moves to the last day.':
    'En los meses más cortos pasa al último día.',
  "I don't have investments": 'No tengo inversiones',
  'I’d rather not say': 'Prefiero no decirlo',
  'That’s {v} so far': 'Llevas {v}',
  'e.g. Car loan': 'p. ej. Préstamo del coche',
  'By total': 'Por importe',
  'By units': 'Por cantidad',
  'Quantity': 'Cantidad',
  'Cost per unit': 'Coste/unidad',
  'How much is left to pay?': '¿Cuánto queda por pagar?',
  '{q} × {p}': '{q} × {p}',
  'Projection': 'Proyección',
  'Saving {v} a month. Simple arithmetic — no investment growth assumed.':
    'Ahorrando {v} al mes. Cuentas simples — sin suponer rentabilidad.',
  'Shares': 'Acciones',
  'Crypto': 'Cripto',
  'Property': 'Inmueble',
  'Fund': 'Fondo',
  'Mortgage': 'Hipoteca',
  'Loan': 'Préstamo',
  'Today': 'Hoy',
}
