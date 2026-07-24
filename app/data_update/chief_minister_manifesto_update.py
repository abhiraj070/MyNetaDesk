"""
Populate `chief_ministers.manifesto_points` with sourced, CM-specific
commitments -- flagship initiatives, governance priorities, and guarantees
tied to the individual CM, researched from official channels (state
government portals, budget speeches, press releases, official party
manifestos only where the CM has personally reiterated them in office).

This is intentionally separate from `chief_minister_update.py` (which owns
identity/roster data: name, state, party, photo). Splitting them means
re-running the roster script never touches this enrichment content, and vice
versa -- the same separation of concerns `manifesto_update.py` already uses
for mps/ministers.

Only state_keys present in MANIFESTO_POINTS get updated; a CM not yet
researched simply keeps whatever's already stored (NULL until first run).
Re-running with an updated entry replaces that CM's list outright rather than
appending -- each entry here is meant to be the full, current best list, not
an incremental patch.

Run from the app/ directory:
    cd app && python -m data_update.chief_minister_manifesto_update
"""
from sqlalchemy import text

from db.connect import engine

# state_key -> list of point strings (1-2 sentences each, sourced from
# official channels -- see the research notes tracked alongside this project
# for the source URL behind each point).
MANIFESTO_POINTS: dict[str, list[str]] = {
    "ODISHA": [
        "Subhadra Yojana: a flagship direct cash-transfer scheme for women aged 21-60, launched September 2024, targeting over 1 crore beneficiaries with a budget outlay of Rs 55,825 crore for 2024-2029.",
        "Presented the 2025-26 state budget (holding the Finance portfolio) with a total outlay of Rs 2,90,000 crore and 16 new schemes.",
        "Mukhyamantri Annapurna Yojana: announced June 2026 to give NFSA/SFSS beneficiaries an additional 5 kg of free rice a month, doubling their entitlement to 10 kg.",
        "'Viksit Odisha 2036' vision, repeated in Independence Day and Republic Day speeches: aims to make Odisha one of India's top-5 developed states by 2036, grow GSDP to $500 billion by 2036 and $1.5 trillion by 2047, and create 1.1 crore additional jobs by 2047.",
        "CM KISAN Yojana: a farmer income-support scheme with Rs 2,020 crore allocated in the 2025-26 budget.",
        "Shree Anna Abhiyan: a millet-promotion scheme with Rs 600 crore allocated in the 2025-26 budget.",
        "Bhubaneswar City Road Decongestion Yojana: over Rs 13,000 crore allocated for urban road decongestion, including a Bhubaneswar outer ring road, announced in the 2025-26 budget.",
    ],
    "RAJASTHAN": [
        "VB (Veer Bal) G Ram Ji Yojana: raises the guaranteed rural wage-employment days from 100 (MGNREGA) to 125 days per household annually.",
        "Rajasthan Industrial Development Policy: targets a $350 billion state economy by 2028-29, with a package of over Rs 13 crore for MSMEs, startups, and handicrafts, and the launch of a World Bank-assisted RAMP portal.",
        "Signed an MoU with the Centre and Madhya Pradesh for the integrated Eastern Rajasthan Canal Project (ERCP) within about six weeks of taking office; the project was formally inaugurated in December 2024 to provide drinking and irrigation water to 13 districts of eastern Rajasthan.",
        "Lakhpati Didi Yojana: announced in the 2025-26 state budget under the Rajivika Mission, targeting the financial empowerment of 20 lakh women.",
        "Ayushman Rajasthan expansion: 2025-26 budget commitment to add daycare centres and diabetic clinics to all district hospitals.",
        "Announced more than 25,000 additional government jobs in the 2025 budget/finance bill debate, with a Rs 10,000 incentive on first salary.",
        "Has publicly stated that 96% of the announcements made in the state's July budget were already implemented, under the 'Aapno Agrani Rajasthan' framing.",
    ],
    "PUNJAB": [
        "Mukh Mantri Mawan Dheeyan Satkar Yojana: announced March 2026, giving women 18+ Rs 1,000/month (Rs 1,500/month for SC women); about Rs 9,300 crore allocated, expected to benefit roughly 52 lakh women, framed by AAP as fulfilling the last of the party's five major 2022 election guarantees.",
        "Has stated Punjab would be the first state to offer a Rs 10 lakh universal healthcare cover to residents.",
        "Personally launched an anti-corruption helpline (9501200200) letting citizens upload evidence of bribery demands; it has led to over 200 arrests, including 135 government officials, within months.",
        "Inaugurated 76 new Mohalla Clinics ahead of Independence Day, bringing the statewide total to 659 as part of a primary-healthcare expansion push.",
        "Presented a Rs 2.36 lakh crore, tax-free 2025-26 state budget -- the government's third consecutive tax-free budget.",
        "'Yudh Nashe De Virudh': an anti-drug campaign launched March 2025, with about Rs 400 crore earmarked to modernize police infrastructure for the drive.",
        "'AAP Di Sarkar, AAP De Dwaar': a doorstep-delivery scheme bringing 43 government services directly to citizens' homes.",
    ],
    "ANDHRA PRADESH": [
        "Talliki Vandanam: launched June 2025, providing Rs 15,000 annually per school-going child (Classes 1 through Intermediate), credited to mothers' bank accounts; over Rs 8,700 crore disbursed to roughly 67 lakh mothers in its first year. Replaces the previous government's 'Amma Vodi' program and is one of the coalition's six 'Super Six' election guarantees.",
        "Deepam 2.0: relaunched November 2024, providing three free LPG cylinders a year (every four months) to all white-ration-card holders, at an estimated annual cost of Rs 2,684 crore.",
        "Annadata Sukhibhava: a farmer-welfare guarantee under 'Super Six' providing Rs 20,000/year per farmer in three instalments (including the Centre's Rs 6,000 PM-Kisan contribution).",
        "Reaffirmed the full slate of 'Super Six' guarantees -- Deepam, Talliki Vandanam, Annadata Sukhibhava, a fishermen's assurance (Matsyakara Bharosa), and free bus travel for women on RTC buses -- while citing the state's inherited financial condition as the reason for a phased rollout.",
        "Stated the government's goal is to make Andhra Pradesh 'poverty-free by 2029,' framed as part of a broader Swarnandhra Vision 2047.",
        "TIDCO housing scheme: personally distributed houses to beneficiaries under this program (March 2026).",
    ],
    "ARUNACHAL PRADESH": [
        "'Viksit Arunachal @2047': a development roadmap citing 166% GSDP growth and a 384% rise in the state's own resources since 2015, including a planned Rs 55,000-crore Frontier Highway.",
        "Declared 2025-2035 the 'Decade of Hydropower' under an Energy Vision and Action Plan 2047, announcing new hydropower projects worth Rs 2 lakh crore over three years to add 19 GW of capacity, aiming to make Arunachal Pradesh India's 'green energy powerhouse' by 2047.",
        "Declared 2024-25 the 'Year of Youth,' introducing scholarship schemes for aspirants of premier institutes as part of a youth-centric roadmap.",
        "Cabinet approved Rs 7,834 crore for four CM Comprehensive Schemes (2026-29): Phase-II road development, rural roads, power, and education.",
        "Announced the rollout of the Mukhya Mantri Shramik Kalyan Yojana for the welfare of the state's labour force.",
        "Eased the CM Disability Pension component of the CM Social Security Scheme, removing the minimum age criterion and lowering the qualifying disability threshold from 70% to 40%.",
    ],
    "ASSAM": [
        "Nijut Moina: launched August 2024, giving monthly stipends (Rs 1,000 higher secondary, Rs 1,250 degree, Rs 2,500 postgraduate) to girl students, explicitly aimed at ending child marriage in Assam by 2026; Rs 1,500 crore outlay targeting 10 lakh girls.",
        "Mission Basundhara 3.0: launched October 2024 as the final phase of a mission to digitize land services and grant land rights to indigenous communities, tea-tribes, Adivasis, Gorkhas, SCs and STs under relaxed eligibility criteria.",
        "Swanirbhar Naari: launched 2022 to empower indigenous handloom weavers, with the state procuring handloom products directly via a web portal to cut out middlemen; nearly 4.8 lakh female weavers registered.",
        "On the 2025-26 state budget, said there were no major new scheme announcements, with the government instead focusing on expanding existing welfare schemes to reach more beneficiaries.",
        "On the 2026-27 budget, said it 'reflects our Sankalp Patra' (election manifesto), highlighting capital expenditure rising from Rs 2,951 crore to Rs 29,000 crore.",
        "Announced a Rs 100-crore plan to position Assam as India's aerospace manufacturing and MRO (Maintenance, Repair & Overhaul) hub.",
    ],
    "BIHAR": [
        "Took oath as Bihar's Chief Minister in April 2026, becoming the state's first-ever BJP Chief Minister, succeeding Nitish Kumar (who moved to the Rajya Sabha).",
        "On being chosen as CM, pledged to serve 'with absolute integrity, dedication, and honesty,' calling it 'a sacred opportunity to serve the people of Bihar.'",
        "At his first Secretariat review meeting, directed officials to work at 'double speed' and enforce a zero-tolerance policy on corruption, prioritizing timely service delivery at block/land offices and police stations.",
        "Set a target of Rs 5 lakh crore in industrial investment for Bihar by November 2026, with Rs 1.36 lakh crore already committed via projects like the Pirpainti and Nabinagar thermal power plants.",
        "Fixed a 30-day deadline for industrial permission approvals (auto-approved thereafter) to speed up investment; the State Investment Promotion Board approved mega cement projects by Dalmia Cement and Ambuja Cement under this push.",
        "Directed officials to expedite a Ganga-side 'Marine Drive' road project between Munger and Bhagalpur for connectivity, tourism and riverfront development.",
    ],
    "CHHATTISGARH": [
        "Mahtari Vandan Yojana: launched March 2024 (with the Prime Minister), giving Rs 1,000/month directly to married women; over 70 lakh beneficiaries statewide as of early 2026.",
        "Krishak Unnati Yojana: launched March 2024, providing Rs 19,257/acre input assistance to paddy farmers; Rs 13,320 crore disbursed via direct benefit transfer to 24+ lakh farmers.",
        "Gaudham Yojana: opened the state's first cow sanctuary, with 29 Gaudhams operational across 11 districts in its first phase, sheltering stray and abandoned cattle.",
        "CM Electricity Bill Payment Solution Scheme 2026: provided Rs 757 crore in relief to roughly 28.42 lakh electricity consumers with pending dues.",
        "Niyad Nellanar Yojana: a welfare scheme for Naxal-affected Bastar villages within 5km of security camps, covering about 25 basic amenities including housing, ration, cooking gas, health sub-centres, schools, roads, and electricity.",
        "Repeatedly reaffirmed a governance priority to eliminate Naxalism in the state, citing security-forces progress against Naxalites over a six-week period.",
    ],
    "DELHI": [
        "Implemented Ayushman Bharat PM-JAY in Delhi as one of her first acts as CM, formally launched April 2025 with the Union Health Minister, giving Rs 5 lakh Central cover plus a Rs 5 lakh Delhi government top-up (Rs 10 lakh total).",
        "Atal Canteens: launched December 2025, with 45 canteens in the first phase (of a planned 100+) offering full meals for Rs 5 to laborers and slum residents; Rs 104.24 crore allocated, aiming to serve over 1 lakh people daily.",
        "Presented the Delhi Budget 2025-26 (Rs 1 lakh crore, up 31.5%), stating all BJP 'Sankalp Patra' (manifesto) promises would be fulfilled, with priorities including women's empowerment, power/water systems, monsoon drainage, air pollution, Yamuna cleaning, and education reform.",
        "Announced 50,000 additional CCTV cameras for women's safety (Rs 225 crore) plus Rs 50 crore for lighting dark spots, in the 2025-26 budget.",
        "Mahila Samriddhi Yojana: cabinet-approved to give Rs 2,500/month to economically weaker women aged 21-60, with Rs 5,110 crore allocated in the 2026-27 budget.",
    ],
    "GOA": [
        "Goa AI Mission 2027: launched July 2025 to shift Goa from a tourism-led economy toward an AI-enabled innovation hub, including a dedicated Goa AI Policy and an AI Advisory Council.",
        "Sudharit Kamdhenu Yojana: revised scheme raising milk procurement incentives to Rs 6/litre (cow) and Rs 10/litre (buffalo), with tiered subsidies for purchasing up to 20 cows or buffaloes.",
        "Clean Goa Green Goa campaign: launched June 2026, targeting 10 lakh trees planted in 90 days, alongside a plan for Goa to be the first state with a dedicated Waste Management Technical Course in ITIs.",
        "Griha Aadhar Scheme: committed in the 2026-27 budget to review and increase financial assistance under this scheme, which already reaches about 40% of Goa's population.",
        "Swayampurna Goa: his own flagship program launched in 2020, deploying government-officer 'Swayampurna Mitras' across village panchayats and municipalities to ensure last-mile delivery of state and central welfare schemes.",
    ],
    "GUJARAT": [
        "Garib Kalyan Mela: inaugurated the 14th statewide phase in September 2024, distributing Rs 45 crore to 11,000+ beneficiaries in a single day as part of Rs 4,568 crore in total benefits under that phase, framed under a poor/youth/farmers/women ('GYAN') welfare framework.",
        "Gujarat Karmayogi Swasthya Suraksha Yojana: gives about 6.4 lakh state government employees, pensioners, and their families cashless medical treatment up to Rs 10 lakh/year.",
        "Integrated Renewable Energy Policy 2025: launched to accelerate Gujarat's clean-energy transition and build an investor-friendly energy ecosystem.",
        "Gujarat AI Action Plan 2025-2030: approved at the state's annual Chintan Shibir, built on six pillars (data, digital infrastructure, capacity building, R&D, startup facilitation, safe and trusted AI), targeting training of 2.5 lakh people in AI/ML.",
        "Viksit Gujarat Industrial Policy 2026: targets Rs 10 lakh crore in new investment over five years, with special provisions for MSMEs, startups, and women entrepreneurs.",
    ],
    "HARYANA": [
        "Deen Dayal Lado Lakshmi Yojana: a women's cash-transfer scheme; by January 2026 the government had disbursed Rs 441 crore across three installments to over 8.6 lakh women beneficiaries.",
        "Announced a new Department/Ministry of Future and the Haryana AI Mission in his 2025 budget speech, backed by Rs 474 crore from the World Bank, with AI hubs in Gurugram and Panchkula meant to train 50,000+ youth.",
        "Mukhyamantri Antyodaya Parivar Utthan Yojana (Antyodaya Saral): an umbrella scheme integrating 49 programs from 19 departments for the state's poorest families; launched Phase II in Sonipat.",
        "Ayushman Bharat-Chirayu Yojana: a state top-up to PM-JAY giving Rs 5 lakh/family annual health cover; the government reports Rs 4,126 crore in free treatment delivered to 25.39 lakh patients.",
        "Released Rs 858 crore for farmer-facing schemes in one sitting (January 2026), covering Crop Residue Management, Direct Seeding of Rice, Mera Pani-Meri Virasat, and price compensation for potato/cauliflower growers.",
    ],
    "HIMACHAL PRADESH": [
        "Restored the Old Pension Scheme (OPS) in his government's very first cabinet meeting after taking office in December 2022, benefiting 1.36 lakh state employees.",
        "Indira Gandhi Pyari Behna Sukh Samman Nidhi Yojana: gives Rs 1,500/month to women aged 18-60, one of the Congress's 10 poll guarantees, budgeted at roughly Rs 800 crore/year for over 5 lakh women.",
        "Mukhyamantri Sukh-Ashraya Yojana: launched February 2023, adopting about 6,000 orphaned or vulnerable children up to age 27 as 'children of the state,' with full education costs plus a Rs 4,000/month allowance; expanded in 2024 to cover abandoned and surrendered children too.",
        "Rajiv Gandhi Start-Up Scheme: a Rs 680-crore scheme for youth entrepreneurship highlighted in his 2024-25 budget speech.",
        "'Pehal' scheme: provides digital ID cards and insurance cover for 40,000 Gaddi, Gujjar, and Kinnaura shepherd families.",
        "Presented a Rs 54,928-crore budget for 2026-27, noting it was the first budget since 1952 presented without a Revenue Deficit Grant from the Centre.",
    ],
    "JAMMU AND KASHMIR": [
        "Announced free rides for all women on government-owned public transport, including e-buses, effective April 2025.",
        "Rolled out a welfare package for Antyodaya Anna Yojana families: 200 free electricity units/month, 10 kg free ration per person/month, and raised old-age/widow/disability pensions, reaching over 10 lakh beneficiaries.",
        "Mission YUVA (Yuva Udyami Vikas Abhiyan): an entrepreneurship-focused flagship mission targeting 1.37 lakh new enterprises and 4.25 lakh jobs in five years; by mid-2026 had logged 1.59 lakh registrations and Rs 756.28 crore in sanctioned loans.",
        "Has repeatedly made restoration of full statehood for Jammu and Kashmir a central governance demand, describing it as the foundation for restoring the region's special constitutional status.",
        "Presented the 2025-26 budget with net estimates of Rs 1,12,310 crore against gross receipts of Rs 1,40,309.99 crore, projecting 7.5% growth.",
    ],
    "JHARKHAND": [
        "Mukhyamantri Maiya Samman Yojana: launched August 2024, initially giving Rs 1,000/month to women aged 21-50; raised to Rs 2,500/month following an October 2024 cabinet decision, reaching over 56 lakh women.",
        "Abua Awas Yojana: launched August 2023, providing Rs 2.5 lakh toward a pucca 3-room house for families living in kutcha housing, targeting 8 lakh houses across three phases with a Rs 16,320-crore outlay.",
        "Backed a 1932 khatiyan-based domicile policy, making 1932 land records the basis for local 'Jharkhandi' identity and domicile certificates, framed as protecting moolvasis and tribal communities.",
        "Has long championed a separate Sarna Dharma Code in the Census for tribal religion; the Jharkhand Assembly passed a resolution in 2020, and Soren has continued pushing the Centre for its inclusion in Census 2027.",
    ],
    "KARNATAKA": [
        "Sworn in as Karnataka's Chief Minister in June 2026, succeeding Siddaramaiah under a Congress power-sharing arrangement.",
        "As CM, publicly reaffirmed that Karnataka's five Congress 'guarantee' welfare schemes (Gruha Lakshmi, Gruha Jyoti, Anna Bhagya, Shakti, Yuva Nidhi) would continue unchanged, stating 'we are not stopping the guarantee schemes.'",
        "Ordered a door-to-door verification survey of guarantee-scheme beneficiaries to remove duplicate or ineligible recipients, framing it as a cleanup exercise rather than a rollback.",
        "Unveiled a Rs 1.25 lakh crore development plan for Bengaluru.",
        "Laid the foundation stone for a toll-free, six-lane Mekhri Circle-Hebbal tunnel road (about Rs 1,139 crore) as part of a longer-term plan to address Bengaluru's traffic congestion.",
    ],
    "KERALA": [
        "Sworn in as Kerala's Chief Minister in May 2026 as the Congress-led UDF returned to power after 10 years, winning 102 of 140 assembly seats.",
        "Government announced free bus travel for women on KSRTC buses and an honorarium increase for ASHA (frontline health) workers shortly after taking office.",
        "In his maiden budget, announced a 'Second Land Reform Initiative' via a new Land Management Policy, aimed at improving landless people's access to land.",
        "Same budget launched 'Mission Samudra,' a Rs 400 crore maritime-economy initiative including a shipbuilding centre at Vizhinjam, an International Maritime Museum, and a kerosene subsidy for fishermen.",
        "Budget created a new Department of Senior Citizens and the Oommen Chandy Health Insurance Scheme, plus full state responsibility for Endosulfan victims.",
        "Government indicated its manifesto pledge to raise the welfare pension from Rs 2,000 to Rs 3,000 would be implemented in phases, following a Rs 20,500 crore revenue-shortfall discovery after taking office.",
    ],
    "MADHYA PRADESH": [
        "Inaugurated the Global Investors Summit 2025 in Bhopal with the Prime Minister; the state reported MoUs worth Rs 30.77 lakh crore with delegations from 60+ countries and a projected 21.4 lakh jobs.",
        "Ladli Behna Yojana: the 2026-27 state budget allocated Rs 23,882 crore for this flagship women's scheme (1.25 crore beneficiaries); has repeatedly pledged to raise the monthly payout to Rs 3,000 before the 2028 assembly election.",
        "Launched 'Balaram Krishi Mahotsav 2026,' declaring 2026 the 'Farmer Welfare Year' -- a campaign across all 55 districts with dairy-unit subsidies, zero-interest crop loans, and a target to expand irrigation from 7.5 lakh to 65 lakh hectares.",
        "Launched the 'Swachh Jal Abhiyan' (Clean Water Campaign) in January 2026, a tech-driven drinking-water monitoring drive, after a contamination-linked diarrhoea outbreak killed several people in Indore.",
        "Launched 'Suman Panchayat' and an AMR 2.0 Action Plan to strengthen maternal health, immunisation, and antimicrobial-resistance response.",
        "The 2026-27 budget under his government earmarked Rs 13,851 crore for the 2028 Simhastha (Ujjain) festival, alongside 15,000 new teacher and 22,500 new police recruitments.",
    ],
    "MAHARASHTRA": [
        "Sworn in for a third term as Maharashtra Chief Minister in December 2024.",
        "Continues to personally champion the Mukhyamantri Majhi Ladki Bahin Yojana (launched July 2024, Rs 1,500/month to eligible women), publicly vowing the scheme will continue amid an eligibility row, with the 2026-27 budget reported to be considering raising the monthly amount to Rs 2,100.",
        "Under a verification/e-KYC drive begun September 2025, over 92 lakh Ladki Bahin beneficiaries were removed for ineligibility or duplication; the 2026-27 budget adjusted the scheme's allocation accordingly.",
        "Has stated a goal of creating 1 crore 'Lakhpati Didis' (women earning over Rs 1 lakh/year) in Maharashtra within two years, alongside continuing Ladki Bahin.",
        "Said Maharashtra, already a $660 billion economy, is targeting a $1 trillion economy by 2030 through infrastructure-led growth.",
        "Presenting the 2026 state budget, announced a fourth Mumbai port at Vadhavan, a Sewri-Worli signal-free connector, and two new Metro lines linking Wadala-Gateway of India and Mumbai-Navi Mumbai airport.",
    ],
    "MANIPUR": [
        "Sworn in as Manipur's Chief Minister in February 2026, ending nearly a year of President's Rule; formed a tripartite cabinet including the state's first Kuki-Zo Deputy CM and a minister representing the Naga community -- a deliberate inclusive-governance structure after the 2023-25 ethnic conflict.",
        "Has repeatedly stated that lasting peace in the state can be achieved only through mutual understanding, dialogue, and cooperation among all communities.",
        "Held the first joint interaction with both Meitei and Kuki-Zo internally displaced persons together since violence began in 2023, and released relief funds via Direct Benefit Transfer to displaced households, including payments for families whose homes were destroyed.",
        "Inaugurated infrastructure and education projects at Moirangpurel, including a bridge built under the Pradhan Mantri Gram Sadak Yojana (PMGSY).",
    ],
    "MEGHALAYA": [
        "CM-Elevate: a state-funded entrepreneurship program targeting over 20,000 entrepreneurs across agriculture, horticulture, and tourism over three years, with government support of 35-75% of project cost.",
        "Chief Minister's Scholarship Scheme (CMSS) 2025: provides a fixed annual scholarship of Rs 6,000, with no income ceiling, to Meghalaya-domiciled students from class 11 through PhD level, expected to benefit about 80,000 students a year.",
        "Under the PRIME Meghalaya program (2021-2025), the state funded 400 entrepreneurs, supported 280 new rural businesses, and incubated 200 startups, generating roughly 4,500 jobs.",
        "Launched flagship skilling programs (PROPEL, MEGASKILL, SHIELD, EQUIP) under 'Skills Meghalaya' to build the state's skilling ecosystem for global and domestic job markets.",
        "Announced a 70% subsidy for homestays ahead of the National Games 2027, to be hosted in Meghalaya.",
    ],
    "MIZORAM": [
        "Handholding Scheme ('Bana Kaih'): launched September 2024, offering collateral-free, interest-free bank loans of up to Rs 50 lakh to selected entrepreneurs and farmers, with the state government acting as guarantor.",
        "The scheme includes interest subvention of up to 100% for consistent loan repayers, and a Chief Minister's Special Category grant of up to Rs 1 lakh for those without loan access but with viable livelihood projects.",
        "Implemented Minimum Support Prices for ginger, broom, turmeric and Mizo bird's-eye chilli, plus pilot paddy procurement in Kolasib and Mamit districts.",
        "Has stated his government's priorities as empowering farmers, improving the state's fiscal position, and curbing corruption.",
    ],
    "NAGALAND": [
        "Presented Nagaland's 2025-26 budget (Rs 24,849 crore outlay), calling it the 'Budget of New Initiatives.'",
        "Highlighted the Chief Minister's Health Insurance Scheme (CMHIS) and Chief Minister's Life Insurance Scheme (CMLIS), extended to government employees and their families, elected members, pensioners, and members of the press.",
        "Announced the Nagaland Skill Mission, targeting employment for 5,000 youths, alongside a Nagaland State Solar Power Mission and a Drone Training Centre in the 2025-26 budget.",
        "Elected President of the Naga People's Front (NPF) for the 2025-2030 term in October 2025, following the formal merger of his former party NDPP into NPF.",
        "Under his leadership, the unified NPF reaffirmed its commitment to pursuing a peaceful and honourable resolution to the long-standing Naga political issue.",
    ],
    "PUDUCHERRY": [
        "Presented a Rs 13,600 crore tax-free budget for 2025-26.",
        "Enhanced monthly financial assistance for Women Heads of BPL families from Rs 1,000 to Rs 2,500.",
        "Announced a Chief Minister's Skill Development Programme targeting 30,000 youth in the 2025-26 budget.",
        "Launched the Ayushman Bharat Vay Vandana Scheme in Puducherry, providing free health insurance coverage up to Rs 5 lakh/year for senior citizens aged 70+.",
        "Announced resumption of free rice distribution to ration card holders, along with 2 kg of free wheat monthly, with Rs 2,110 crore earmarked overall for major welfare schemes.",
    ],
    "SIKKIM": [
        "After his party's landslide 2024 win, announced a 'Golay ko Nau Guarantee' (nine guarantees) covering healthcare, education, employment, and women's empowerment.",
        "Presented Sikkim's 2025-26 budget of Rs 16,196 crore, focused on youth empowerment, farmer welfare, infrastructure expansion, and financial discipline.",
        "Championed the Aama Yojana, depositing Rs 20,000 annually into the bank accounts of non-working mothers to encourage savings, and the Bahini Yojana, aimed at reducing girls' school dropout linked to menstrual health and hygiene access.",
        "His official government profile describes his governance philosophy as bringing new momentum in youth development, decentralised governance, women's empowerment, and green economy initiatives.",
    ],
    "TAMIL NADU": [
        "Sworn in as Chief Minister of Tamil Nadu in May 2026 after his party won the largest single-party seat share and formed a coalition government -- the first non-Dravidian-party-led government in the state since 1967.",
        "His first signed order as CM revised the electricity subsidy: households using up to 500 units over two months get 200 free units, higher-consumption households get 100 free units.",
        "Among his first orders: creation of the 'Singa Pen Special Task Force,' a statewide women's-safety task force, and 65 dedicated anti-narcotics police stations across the state.",
        "At the order-signing ceremony, described his government as marking 'a new era of real secular social justice' and pledged to stand with minorities.",
    ],
    "TELANGANA": [
        "On his first day as CM (December 2023), gave same-day assent to implement Congress's pre-poll 'Six Guarantees' (Rythu Bharosa, Gruha Jyothi, Yuva Vikasam, Indiramma Illu, Cheyutha, Mahalakshmi).",
        "Personally launched the Mahalakshmi scheme (free women's travel on TSRTC buses, Rs 2,500/month for women heads of household, subsidised LPG cylinders) with a ceremonial bus ride shortly after taking office.",
        "Cheyutha: a health scheme providing free medical coverage up to Rs 10 lakh under Rajiv Arogyasri for an estimated 90.10 lakh BPL families.",
        "Gruha Jyothi: a free-electricity scheme providing up to 200 units/month at zero bill for eligible white-ration-card households, formally launched in February 2024.",
        "Indiramma Illu: a housing guarantee that sanctioned 4,50,000 houses at Rs 5 lakh per unit.",
    ],
    "TRIPURA": [
        "Inaugurated Rs 105.73 crore worth of development projects in Udaipur (Gomati district) as part of a Rs 10,000 crore capital-expenditure push for state infrastructure.",
        "Launched a statewide non-communicable-disease screening drive (Mukhyamantri Niramaya Arogya Abhiyan) targeting 15 lakh people annually for early detection of hypertension, diabetes, and other chronic conditions.",
        "Government committed to completing six more Eklavya Model Residential Schools (EMRS) by March 2026.",
        "Championed 'Lakshya 2047,' Tripura's long-term vision document for governance and institutional reform, presented at a NITI Aayog interaction with North Eastern states.",
        "The Destination Tripura Conclave 2026, held under his government, drew over 1,200 delegates and generated MoUs worth Rs 1.21 lakh crore.",
    ],
    "UTTAR PRADESH": [
        "Launched 'Nivesh Mitra 3.0,' a digital investor-facilitation platform with an AI chatbot and real-time status alerts, alongside a Private Business Park Development Scheme and a Plug-and-Play Industrial Sheds Scheme, distributing Rs 2,781 crore in Letters of Comfort, Eligibility Certificates, and subsidies.",
        "Launched the second phase of the statewide 'School Chalo Abhiyan 2026' school-enrollment campaign, citing a drop in the school dropout rate to 3-4%.",
        "As part of that education push, raised honoraria for part-time teachers (Shiksha Mitras) from Rs 10,000 to Rs 18,000 and instructors from Rs 9,000 to Rs 17,000, plus insurance cover for these staff, and expanded scholarships to roughly 23,000 differently-abled girls.",
        "Launched a Digital Entrepreneur Scheme to place entrepreneurs, half of them women, in 8,000 Nyaya Panchayats.",
    ],
    "UTTARAKHAND": [
        "Implemented the Uniform Civil Code (UCC) in Uttarakhand in January 2025, making it the first Indian state to do so.",
        "Announced India's first dedicated Agniveer Cell for the rehabilitation, welfare, and post-service employment of Agniveers.",
        "Alongside the Agniveer Cell, announced 10% horizontal reservation for ex-servicemen and Agniveers in state police, forest department, and disaster-management recruitment, plus a rise in ex-gratia compensation for martyred soldiers' families from Rs 10 lakh to Rs 50 lakh.",
        "Has cited abolition of the Uttarakhand Madrasa Board and agriculture-promotion missions (Kiwi, Apple, Timru) among his government's achievements.",
    ],
    "WEST BENGAL": [
        "Sworn in as West Bengal's first-ever BJP Chief Minister in May 2026, after BJP won 207 of 294 seats, ending 15 years of TMC rule.",
        "Formed a cabinet with five ministers sworn in alongside him at the same ceremony.",
        "In his post-swearing-in remarks, named industrial revival, law and order, and welfare schemes for farmers and women as his government's stated priorities.",
    ],
}


def update_manifesto_points(points_by_state_key: dict[str, list[str]]) -> None:
    with engine.begin() as conn:
        for state_key, points in points_by_state_key.items():
            result = conn.execute(text("""
                UPDATE chief_ministers
                SET manifesto_points = :points
                WHERE state_key = :state_key
            """), {"state_key": state_key, "points": points})
            if result.rowcount == 0:
                print(f"WARNING: no chief_ministers row matched state_key={state_key!r}")


def main() -> None:
    update_manifesto_points(MANIFESTO_POINTS)
    print(f"Updated manifesto_points for {len(MANIFESTO_POINTS)} state(s)")


if __name__ == "__main__":
    main()
