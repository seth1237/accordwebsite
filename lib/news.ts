export type NewsRelated = { label: string; href: string }

export type NewsPost = {
  slug: string
  title: string
  tag: string
  date: string
  isoDate: string
  summary: string
  body: string[]
  related?: NewsRelated[]
}

export const newsPosts: NewsPost[] = [
  {
    slug: 'electric-obstetric-delivery-bed-redefining-safe-maternity-care-under-uhc',
    tag: 'Maternity',
    date: '12 Mar 2025',
    isoDate: '2025-03-12',
    title: 'Electric obstetric delivery beds for maternity units in Kenya',
    summary:
      'What hospitals look for in an electric delivery bed, and how maternity teams use obstetric couches under routine and UHC-linked care.',
    body: [
      'Maternity wards in Kenya need a delivery bed that can be adjusted quickly, cleaned between cases, and used safely by midwives and obstetric teams. Search demand for maternity beds, electric delivery beds and delivery couches already points facilities to Accord Medical Supplies for this category.',
      'An electric obstetric delivery bed is specified for height, Trendelenburg positions, detachable leg supports and a durable mattress. Facilities comparing a hydraulic delivery couch with a fully electric model usually trade off power independence against faster positioning during labour and recovery.',
      'Accord lists maternity equipment used in Kenyan hospitals, including electric delivery beds and obstetric couches. Procurement teams typically request a quote with the ward layout, power availability and whether the unit will also serve theatre recovery.',
      'If you are equipping a maternity theatre or labour ward, start with the maternity catalogue and the specific delivery-bed product pages, then ask the Eldoret sales team or Nairobi warehouse for availability.',
    ],
    related: [
      { label: 'Maternity equipment', href: '/category/maternity' },
      { label: 'Hydraulic delivery couch', href: '/product/hydraulic-delivery-couch-t710' },
      { label: 'Request a quote', href: '/customer-request/get-quote' },
    ],
  },
  {
    slug: 'why-the-zybio-z50-5-part-hematology-analyzer-matters-for-kenya',
    tag: 'Laboratory',
    date: '04 Feb 2025',
    isoDate: '2025-02-04',
    title: 'Zybio Z50 5-part hematology analyser for Kenyan laboratories',
    summary:
      'How hospital laboratories use a 5-part hematology analyser such as the Zybio Z50, and when a 3-part system is still the better fit.',
    body: [
      'Hospital laboratories searching for hematology analysers in Kenya often compare 3-part and 5-part differential systems. The Zybio Z50 is the 5-part model Accord Medical Supplies already ranks for, alongside the Z3 3-part analyser.',
      'A 5-part analyser reports a fuller white-cell differential, which matters for inpatient work, referral hospitals and laboratories that want fewer manual film reviews. Smaller clinics sometimes stay on a 3-part system because the workload and reagent cost are lower.',
      'When requesting a quote, laboratories usually include daily CBC volume, whether they need cap-piercing, and the service coverage they expect after installation. Accord supplies the analyser, related laboratory equipment, and after-sales support from the Nairobi warehouse and Eldoret office.',
    ],
    related: [
      { label: 'Zybio Z50 5-part analyser', href: '/product/5-part-hematology-analyser-z50' },
      { label: 'Zybio Z3 3-part analyser', href: '/product/3-part-hematology-analyzer-z3' },
      { label: 'Laboratory equipment', href: '/category/laboratory' },
    ],
  },
  {
    slug: 'lamuno-pro-immunoassay-analyzer-advanced-clia-testing-for-kenyan-labs',
    tag: 'Diagnostics',
    date: '21 Jan 2025',
    isoDate: '2025-01-21',
    title: 'Lamuno Pro immunoassay analyser for Kenyan hospital labs',
    summary:
      'Where CLIA immunoassay sits in a hospital laboratory, and how the Lamuno Pro is used alongside chemistry and hematology systems.',
    body: [
      'Immunoassay demand in Kenyan laboratories sits next to hematology and chemistry. Facilities looking up the Lamuno Pro are usually adding CLIA testing for hormones, infectious-disease markers or other specialised assays rather than replacing a chemistry analyser.',
      'The Lamuno Pro immunoassay analyser is listed in the Accord diagnostic catalogue. Laboratories typically ask about assay menu, throughput, reagent supply and whether installation includes operator training.',
      'If the laboratory also needs dry chemistry or a fully automated biochemistry analyser, those systems are listed separately so each department can quote the combination it actually runs.',
    ],
    related: [
      { label: 'Lamuno Pro immunoassay analyser', href: '/product/lamuno-pro-immunoassay-analyzer' },
      { label: 'Diagnostic products', href: '/category/diagnostic-products' },
      { label: 'Laboratory equipment', href: '/category/laboratory' },
    ],
  },
  {
    slug: 'baby-warmer-installation-at-majengo-nursing-home-maternity-mombasa',
    tag: 'Projects',
    date: '18 Nov 2024',
    isoDate: '2024-11-18',
    title: 'Baby warmer installation at Majengo Nursing Home, Mombasa',
    summary:
      'A maternity installation in Mombasa and how newborn-care equipment is commissioned for nursing homes and hospital maternity units.',
    body: [
      'Newborn-care searches on this site often land on incubators, infant warmers and phototherapy lamps. The Majengo Nursing Home maternity installation in Mombasa is one of the project stories facilities already associate with Accord Medical Supplies.',
      'A baby warmer is specified for open care, temperature control and easy access during resuscitation or routine examination. Many maternity units pair a warmer with a closed incubator and a phototherapy lamp rather than buying a single device for every use.',
      'Accord’s project pages collect recent installations. If you are planning a similar maternity setup, review the newborn-care products and request a quote with the room size and power available on the ward.',
    ],
    related: [
      { label: 'Recent projects', href: '/projects' },
      { label: 'Maternity equipment', href: '/category/maternity' },
      { label: 'Baby incubator BB-100', href: '/product/baby-incubator-bb-100-top-grade' },
    ],
  },
  {
    slug: 'sk5002-coagulation-analyzer-precision-diagnostics-for-your-lab',
    tag: 'Laboratory',
    date: '09 Sep 2024',
    isoDate: '2024-09-09',
    title: 'SK5002 coagulation analyser for hospital laboratories',
    summary:
      'Coagulation testing sits beside hematology in most hospital labs. Here is how the SK5002 is typically quoted for Kenyan facilities.',
    body: [
      'Coagulation analysers are a steady search on Accord’s laboratory pages. The SK5002 is the model already associated with this site for PT, APTT and related clotting work.',
      'Laboratories usually add coagulation after hematology is in place. Quote requests should include the test menu, expected daily samples and whether the bench also runs chemistry.',
      'Browse the SK5002 product page and the wider laboratory catalogue, then send the assay list with your request so sales can confirm reagents and installation.',
    ],
    related: [
      { label: 'SK5002 coagulation analyser', href: '/product/coagulation-analyzer-sk5002' },
      { label: 'Laboratory equipment', href: '/category/laboratory' },
    ],
  },
  {
    slug: 'the-theatre-setup',
    tag: 'Theatre',
    date: '02 Jun 2024',
    isoDate: '2024-06-02',
    title: 'Theatre setup: tables, suction and ICU equipment',
    summary:
      'A practical overview of operating theatre and ICU equipment hospitals request from Accord, from operating tables to patient monitors.',
    body: [
      'Theatre and ICU searches on this site cover operating tables, suction machines, diathermy, patient monitors and anaesthesia machines. Facilities rarely buy these as isolated items; they specify a room.',
      'A typical theatre quote starts with the operating table, suction, electrosurgery and lighting, then adds monitoring and anaesthesia. ICU rooms lean toward beds, monitors and suction rather than a full operating table.',
      'Accord’s theatre and intensive care catalogue is the place to browse those products together. Biomedical installation and after-sales service are handled as a separate conversation once the equipment list is agreed.',
    ],
    related: [
      { label: 'Theatre and ICU equipment', href: '/category/theatre-intensive-care-unit' },
      { label: 'Biomedical engineering services', href: '/biomedical-engineering-services.html' },
      { label: 'Electric operating table', href: '/product/electric-operating-table-ch-t200' },
    ],
  },
  {
    slug: 'enhancing-newborn-care-the-importance-of-baby-incubators-and-infant-warmers',
    tag: 'Maternity',
    date: '14 Apr 2024',
    isoDate: '2024-04-14',
    title: 'Baby incubators and infant warmers for newborn care',
    summary:
      'When a maternity unit needs a closed incubator, an open warmer, or both, and how Kenyan facilities usually specify the pair.',
    body: [
      'Newborn units distinguish closed incubators from open radiant warmers. Incubators hold a controlled environment for longer stays; warmers are used for resuscitation, procedures and step-down care.',
      'Accord lists baby incubators, infant warmers and phototherapy lamps in the maternity catalogue. Facilities often request the three together so the nursery is not waiting on a second purchase after the first device arrives.',
      'Share the number of cots, power stability and whether the unit also needs a resuscitator when you request a quote.',
    ],
    related: [
      { label: 'Maternity equipment', href: '/category/maternity' },
      { label: 'Infant resuscitator', href: '/product/infant-resuscitator-br-100' },
    ],
  },
  {
    slug: 'enhancing-newborn-care-the-importance-of-baby-incubators-and-infant-warmers-2',
    tag: 'Maternity',
    date: '16 Apr 2024',
    isoDate: '2024-04-16',
    title: 'Specifying incubators and warmers for Kenyan maternity wards',
    summary:
      'A shorter buying guide for maternity teams comparing incubators, warmers and phototherapy when expanding newborn care.',
    body: [
      'This follow-up is for procurement teams who already know they need newborn-care equipment and want a cleaner specification list: incubator capacity, warmer access, phototherapy wavelength and spare tubes or bulbs.',
      'Start from the maternity catalogue, then open the individual incubator and warmer pages. If you already run a similar installation, the projects section shows how those rooms were commissioned.',
    ],
    related: [
      { label: 'Maternity equipment', href: '/category/maternity' },
      { label: 'Recent projects', href: '/projects' },
    ],
  },
  {
    slug: 'equipping-laboratories-for-reliable-diagnostics',
    tag: 'Clinical insight',
    date: '19 Aug 2026',
    isoDate: '2026-08-19',
    title: 'Equipping laboratories for reliable diagnostics',
    summary: 'How the right consumables and equipment keep Kenyan facilities running.',
    body: [
      'Reliable diagnostics start with equipment and consumables that facilities can actually keep in service.',
      'From hematology and chemistry analyzers to cold-chain storage, the right mix of products and after-sales support keeps hospital and clinic laboratories running.',
    ],
    related: [
      { label: 'Laboratory equipment', href: '/category/laboratory' },
      { label: 'Diagnostic products', href: '/category/diagnostic-products' },
    ],
  },
  {
    slug: 'accord-medical-serving-hospitals-from-nairobi',
    tag: 'Company news',
    date: '04 Aug 2026',
    isoDate: '2026-08-04',
    title: 'Accord Medical serving hospitals from Nairobi',
    summary: 'Closer support for clinics and laboratories across the region.',
    body: [
      'Accord Medical Supplies works with hospitals, clinics, and laboratories across Kenya and Uganda.',
      'From the Nairobi warehouse and sales team, we help facilities source, install, and maintain medical equipment.',
    ],
    related: [
      { label: 'Contact the Nairobi warehouse', href: '/get-in-touch/contact' },
      { label: 'About Accord Medical Supplies', href: '/about.html' },
    ],
  },
]

export function getPostBySlug(slug: string) {
  return newsPosts.find((post) => post.slug === slug) || null
}

export function newsPostHref(post: Pick<NewsPost, 'slug'>) {
  return `/post/${post.slug}`
}
