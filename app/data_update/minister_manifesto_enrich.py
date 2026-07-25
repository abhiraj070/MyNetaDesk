"""
Enrich `ministers.manifesto_points` with sourced, minister-specific
commitments -- department-specific promises, vision statements,
parliamentary statements, budget announcements, and flagship
initiatives/reforms tied to the individual minister, researched from official
channels (PIB press releases, the ministry's own website, Lok Sabha/Rajya
Sabha records, official budget documents).

This REPLACES each named minister's existing `manifesto_points` outright
(most rows currently hold a single auto-generated line from the original
`minister_update.py` import) rather than appending -- each entry here is
meant to be the fuller, current best list, so blind concatenation would just
create near-duplicates.

Keyed by `minister_name` alone, not `(ministry, minister_name)`: a person
holding multiple portfolios gets the same consolidated list written to every
one of their rows, since the commitments describe the person's overall
record as a minister, not one specific portfolio row. (Some ministers have
more than one row in `ministers` -- see the table's `UNIQUE (ministry,
minister_name)` constraint -- this script updates all matching rows for a
name in one pass.)

Run from the app/ directory:
    cd app && python -m data_update.minister_manifesto_enrich
"""
from sqlalchemy import text

from db.connect import engine

# minister_name -> list of point strings (1-2 sentences each, sourced from
# official channels -- see the research notes tracked alongside this project
# for the source URL behind each point).
MANIFESTO_POINTS: dict[str, list[str]] = {
    "Bhagirath Choudhary": [
        "In a Lok Sabha written reply, stated the Department of Agriculture & Farmers' Welfare's budget allocation was raised from Rs 21,933 crore in 2013-14 to Rs 1,27,290 crore in 2025-26.",
        "Reported that 18,825 farmer clusters have been formed covering roughly 9 lakh hectares, with 19 lakh farmers registered under the scheme to date.",
        "Cited the establishment of 731 Krishi Vigyan Kendras nationally as part of efforts to promote farming as a viable career for rural youth.",
        "Publicly stated the central government has been committed to farmer welfare since 2014, pointing to PM-Kisan Samman Nidhi and MSP increases as evidence.",
    ],
    "C. R. Patil": [
        "Launched the 'Jal Shakti Hackathon-2025' and the Bharat-WIN Portal, framed as advancing the government's 'Water Vision @2047' for scientific and technology solutions in the water sector. (Portfolio: Jal Shakti)",
        "Chaired the 15th meeting of the Empowered Task Force on Ganga Conservation under the Namami Gange programme. (Portfolio: Jal Shakti)",
        "Reviewed the 'Jalaj' initiative, aimed at combining river conservation with livelihood generation. (Portfolio: Jal Shakti)",
        "Chaired a Parliamentary Consultative Committee meeting on the Jal Jeevan Mission and the 'Sujal Gram Samvad' series, emphasizing community-led water security and last-mile service delivery. (Portfolio: Jal Shakti)",
        "Welcomed the Union Cabinet's approval of an additional Rs 1.51 lakh crore to complete the Jal Jeevan Mission, with its outlay enhanced to Rs 67,000 crore for 2025-26 and the mission's timeline extended to December 2028. (Portfolio: Jal Shakti)",
    ],
    "Ajay Tamta": [
        "At the RAHSTA Expo 2026 in Mumbai, presented the RAHSTA Awards to 24 organizations including MMRDA, BRO, and Haryana PWD, stating that technology is becoming central to highway development.",
        "Held a dialogue with IIT Delhi and SPA Delhi experts on innovation-led, safety-integrated road planning, saying the Ministry is 'not just building roads, but shaping corridors' under the Viksit Bharat 2047 vision.",
        "Reviewing Jammu and Kashmir highway projects, highlighted a Rs 1.35 lakh crore infrastructure push and the region's road-network transformation over the past 12 years.",
        "Cited figures showing 51 road project packages implemented in Manipur over the last five years, involving roughly Rs 12,000 crore in expenditure.",
    ],
    "Amit Shah": [
        "Replied in the Lok Sabha to the discussion on the Delimitation Bill, 2026, the Constitution (131st Amendment) Bill, 2026, and the Union Territories Laws (Amendment) Bill, 2026. (Portfolio: Home Affairs)",
        "Reiterated a zero-tolerance policy on terrorism and stated that Left-Wing Extremism/Naxalism would end in India by March 2026. (Portfolio: Home Affairs)",
        "At the Ministry of Cooperation's 5th Foundation Day, unveiled a 'Cooperation 2.0' roadmap covering professional management, digital governance, and expanded market access, citing a cooperative database now covering 8.58 lakh cooperative societies. (Portfolio: Co-operation)",
        "Announced plans to establish a cooperative life insurance company to expand the cooperative sector's business scope. (Portfolio: Co-operation)",
        "Formally launched 'Bharat Taxi,' India's first cooperative-based taxi service, stating it would expand to 500 cities within two years. (Portfolio: Co-operation)",
    ],
    "Annpurna Devi": [
        "Chaired a review of the Savitribai Phule National Institute of Women and Child Development's Western Regional Centre, at which a new Advanced Diploma in Child Guidance and Counselling programme was announced.",
        "Announced the inclusion of Anganwadi workers under the Ayushman Bharat Yojana.",
        "Represented India at the SCO Women's Forum 2026 in Bishkek, reaffirming India's commitment to women-led development.",
        "Chaired a meeting of the Parliamentary Consultative Committee for the Ministry of Women & Child Development.",
    ],
    "Anupriya Patel": [
        "Participated in the session 'Innovation to Impact: AI as a Public Health Game-Changer' at the India AI Impact Summit 2026, speaking on AI's role in public health. (Portfolio: Health and Family Welfare)",
        "Addressed a high-level UN side event on ending AIDS at the UN General Assembly. (Portfolio: Health and Family Welfare)",
        "In a written Rajya Sabha reply, stated 41 products have been identified for domestic manufacture under the PLI Scheme for Bulk Drugs (total outlay Rs 6,940 crore), with cumulative sales of Rs 2,315.44 crore reported by September 2025. (Portfolio: Chemicals and Fertilizers)",
        "Presided, alongside the Union Health Minister, over a review meeting of the Department of Pharmaceuticals. (Portfolio: Chemicals and Fertilizers)",
    ],
    "Arjun Ram Meghwal": [
        "Stated the three new criminal codes (Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita, and Bharatiya Sakshya Adhiniyam, replacing the IPC, CrPC, and Evidence Act) would take effect from July 2024, describing them as freed of colonial-era influence. (Portfolio: Law and Justice)",
        "Introduced the Delimitation Bill, 2026 and the Constitution (131st Amendment) Bill, 2026 in the Lok Sabha, proposing to expand the Lok Sabha from 543 to roughly 850 seats and implement one-third reservation for women. (Portfolio: Law and Justice / Parliamentary Affairs)",
        "Said government reforms aim to build a transparent, efficient, world-class arbitration ecosystem so India can become a global arbitration hub. (Portfolio: Law and Justice)",
        "Represented India at the 12th SCO Justice Ministers Meeting. (Portfolio: Law and Justice)",
    ],
    "Ashwini Vaishnaw": [
        "Announced plans for 200 new Vande Bharat trains, 100 Amrit Bharat trains, and 50 Namo Bharat rapid-rail services over the next two to three years. (Portfolio: Railways)",
        "Announced Cabinet approval of 'Semicon 2.0,' a Rs 1.27 lakh crore semiconductor programme projected to draw about Rs 4 lakh crore in investment. (Portfolio: Electronics and IT)",
        "Stated the India Semiconductor Mission has 10 projects under construction, with 67,000 students trained in chip design across 315 institutions. (Portfolio: Electronics and IT)",
        "Outlined plans to integrate the Registrar of Newspapers for India, Central Bureau of Communication, and PIB to streamline media regulatory functions. (Portfolio: Information and Broadcasting)",
    ],
    "B. L. Verma": [
        "Inaugurated the 75th Pradhan Mantri Divyasha Kendra at Badaun, Uttar Pradesh, part of the assistive-devices distribution programme for persons with disabilities. (Portfolio: Social Justice and Empowerment)",
        "Presided over a NAMASTE Yojana event in Bareilly honoring sanitation workers. (Portfolio: Social Justice and Empowerment)",
        "Inaugurated the 23rd Divya Kala Mela in Vadodara, where loans worth Rs 1 crore were distributed to 30 beneficiaries with disabilities. (Portfolio: Social Justice and Empowerment)",
        "In a written Lok Sabha reply, said the government is strengthening drug demand reduction and expanding de-addiction services under centrally sponsored schemes. (Portfolio: Social Justice and Empowerment)",
        "Addressed World Consumer Rights Day 2025 events on consumer protection. (Portfolio: Consumer Affairs, Food and Public Distribution)",
    ],
    "Bandi Sanjay Kumar": [
        "Laid the foundation stone for the new CISF Headquarters building in New Delhi.",
        "Stated there would be no talks with Maoists until they lay down arms, ruling out negotiation while they remain armed.",
        "Told the Lok Sabha the 'Pratibimb' cybercrime-tracking module has led to over 16,000 arrests and more than 1,05,000 investigation-assistance requests.",
        "Described the government's cybercrime-coordination architecture, including the National Cyber Security Coordinator and the Indian Cybercrime Coordination Centre (I4C).",
    ],
    "Bhupathi Raju Srinivasa Varma": [
        "Launched SRTMI's (Steel Research and Technology Mission of India) R&D Schemes and web portal to catalyse innovation in the Indian steel sector. (Portfolio: Steel)",
        "Inaugurated MMMM 2024, an international conference on process and product innovations, including a seminar on green steel production. (Portfolio: Steel)",
        "In a written Rajya Sabha reply, stated Rs 455 crore has been allocated for hydrogen-based pilot steel projects as part of the push toward green steel and India's 2070 net-zero goal, noting the government notified the Taxonomy of Green Steel in December 2024. (Portfolio: Steel)",
        "Inaugurated the AIIFA National Conference on Sustainable Innovation in Steel in Mumbai. (Portfolio: Steel)",
    ],
    "Bhupender Yadav": [
        "Delivered the inaugural address at the World Sustainable Development Summit 2025, framing India's net-zero-by-2070 target and a 36% reduction in emission intensity of GDP against a 45%-by-2030 target.",
        "At COP30, announced India will submit its revised Nationally Determined Contribution (NDC) for the 2035 period, citing the Nuclear Mission and Green Hydrogen Mission as accelerants toward net-zero by 2070.",
        "Released the India State of Forest Report, stating India's forest cover grew by 13,669 sq km since 2014.",
        "Launched the Meri LiFE App under Mission LiFE (Lifestyle for Environment).",
    ],
    "Chirag Paswan": [
        "Announced a PMFME (PM Formalisation of Micro Food Processing Enterprises) Scheme milestone: loans sanctioned to over 2 lakh micro food processing enterprises, leveraging project investment of over Rs 20,300 crore, with about 90% first-generation entrepreneurs and 44% women beneficiaries.",
        "Stated the government's goal to double food processing's share of total farm output to 25% over the next five years.",
        "Inaugurated an MOFPI-supported Common Incubation Centre at VNMKV, Parbhani, funded under the Atmanirbhar Bharat Abhiyan, to boost food-processing entrepreneurship.",
        "Said food processing will play a decisive role in realising the Viksit Bharat 2047 vision, naming setting up processing units and taking Indian brands global as top priorities.",
        "At World Food India, MoUs worth Rs 1 lakh crore were signed under his ministry.",
    ],
    "Dharmendra Pradhan": [
        "At Akhil Bharatiya Shiksha Samagam 2025, said NEP 2020 is the most significant route to the Viksit Bharat 2047 vision, launching the TARA App and My Career Advisor App and unveiling initiatives worth over Rs 4,000 crore.",
        "Held a review meeting on NEP 2020 implementation in school education.",
        "Lauded the 2025-26 Union education budget, raised 8.27% to Rs 1.39 lakh crore, as a 'Yuva Shakti'-driven budget.",
        "Stated the Union Cabinet approved Rs 27,360 crore for the PM SHRI (PM Schools for Rising India) scheme, to upgrade 14,597 schools into 'model schools' between 2022 and 2027.",
    ],
    "Durga Das Uikey": [
        "Stated Rs 23,915.13 lakh was released for Jharkhand under the Eklavya Model Residential Schools (EMRS) scheme during 2023-24, in response to a parliamentary question.",
        "Said TRIFED's collaborations with bodies like NIFT and HPMC aim to give tribal artisans and entrepreneurs wider market access through online and offline platforms.",
        "At the launch of the Model Youth Gram Sabha initiative, said the Gram Sabha is the first unit of government and central to democracy.",
        "At the National Tribal and Folk Culture Literary Festival, said tribal communities' contributions have been significant across eras and must be preserved and promoted.",
    ],
    "G. Kishan Reddy": [
        "Launched the eighth tranche of e-auction of 20 critical and strategic mineral blocks at the curtain-raiser for India Mining Week 2026. (Portfolio: Mines)",
        "During a visit to Western Coalfields Limited, inaugurated or laid foundation stones for several community projects and flagged off 25 electric vehicles. (Portfolio: Coal)",
        "Reviewed rehabilitation works under the Revised Jharia Master Plan. (Portfolio: Coal)",
        "Launched the 10th tranche of commercial coal mine auctions. (Portfolio: Coal)",
        "Said the government is encouraging private companies to mine critical minerals overseas to meet domestic needs and reduce import dependence. (Portfolio: Mines)",
    ],
    "Gajendra Singh Shekhawat": [
        "Welcomed the 2026-27 Union Budget as giving an unprecedented boost to tourism, culture and heritage, highlighting proposals for a National Institute of Hospitality and training of 10,000 tourist guides at iconic destinations. (Portfolio: Tourism)",
        "Cited Swadesh Darshan and PRASHAD as flagship destination-development schemes, with roughly 120 projects completed at a cost of over Rs 6,800 crore. (Portfolio: Tourism)",
        "Highlighted flagship culture initiatives underway, including the Yuga Yugeen Bharat Museum in New Delhi, the National Manuscript Mission, and the Global Kashi Cultural Path. (Portfolio: Culture)",
        "Said preserving and promoting India's diverse folk traditions is a core mission of the Ministry of Culture. (Portfolio: Culture)",
    ],
    "Jagat Prakash Nadda": [
        "Launched Aarogya Setu 2.0 and other digital health initiatives, expanding healthcare access and electronic health record interoperability. (Portfolio: Health and Family Welfare)",
        "Launched SAHI (Strategy for AI in Healthcare for India) and BODH (a benchmarking open-data platform for health AI) at the India AI Impact Summit 2026. (Portfolio: Health and Family Welfare)",
        "Reviewed dengue and malaria preparedness ahead of the monsoon season with health officials. (Portfolio: Health and Family Welfare)",
        "Told Parliament that no shortage of chemical fertilizers was reported during the Kharif and Rabi 2025-26 seasons, with adequate national availability of Urea, DAP, MOP and NPKS. (Portfolio: Chemicals and Fertilizers)",
        "Backed the PM-PRANAM scheme to promote sustainable, balanced fertilizer use and restore soil health across states. (Portfolio: Chemicals and Fertilizers)",
    ],
    "Jayant Chaudhary": [
        "Launched the IndiaSkills Competition 2026-27, the flagship national skills competition spanning 63 industry-relevant categories. (Portfolio: Skill Development and Entrepreneurship)",
        "Launched a week-long celebration marking 10 years of the Skill India Mission, including a new AI-skilling program for school children. (Portfolio: Skill Development and Entrepreneurship)",
        "Launched Swavalambini, a Women Entrepreneurship Programme aimed at equipping young women to start their own businesses. (Portfolio: Skill Development and Entrepreneurship)",
        "Outlined a vision for AI-driven education and skilling, announcing India's first AI-enabled state university pilot at CCS University, Meerut. (Portfolio: Education)",
        "Called India's Digital Public Infrastructure a model for the Global South. (Portfolio: Education)",
    ],
    "Jitan Ram Manjhi": [
        "Reviewed implementation of MSME flagship schemes in Puducherry and urged banks to facilitate greater institutional credit access for MSMEs.",
        "Became the first-ever MSME Minister to visit Ladakh, reviewing flagship scheme implementation and reaffirming a commitment to inclusive, sustainable growth.",
        "Held a high-level review meeting to assess and protect MSMEs from potential fallout of the West Asia crisis.",
        "Presided over the PM Vishwakarma-National SC-ST Hub Mega Conclave in Bodh Gaya, Bihar, attended by over 2,500 scheme beneficiaries.",
    ],
    "Jitendra Singh": [
        "Hailed the 2025-26 Union Budget's decision to open private-sector participation in the nuclear industry as a 'game-changer' for the energy sector. (Portfolio: Science and Technology)",
        "Presented year-end achievements of the Science & Technology ministries, stating India's future growth will be led by space, oceans, biotechnology, clean energy and advanced manufacturing. (Portfolio: Science and Technology)",
        "Announced policy reforms to enhance 'Ease of Innovation,' 'Ease of Research' and 'Ease of Science,' enabling academic and research institutions to bypass procurement and financial-ceiling hurdles. (Portfolio: Science and Technology)",
        "Oversaw high-level India-Vietnam talks expanding science and technology cooperation in AI, deep-tech and innovation. (Portfolio: Science and Technology)",
    ],
    "Giriraj Singh": [
        "Inaugurated Bharat Tex 2026 at Bharat Mandapam, New Delhi -- India's flagship global textile event, drawing over 6,000 buyers from 130+ countries and 1.3 lakh trade visitors.",
        "Chaired a review meeting in Kolkata with jute, handloom and handicrafts sector stakeholders to discuss strategies for innovation, diversification and value addition.",
        "Stated a roadmap is set for the textile industry to grow to $350 billion by 2030, up from about $190 billion in 2025-26.",
        "Cited the 'Tex-Eco Initiative' for environmentally responsible production and Mega Textile Parks selected via competitive process, with emphasis on technical textiles.",
        "Stated the government's aim to achieve $10 billion in handloom exports by 2031.",
    ],
    "H. D. Kumaraswamy": [
        "Released India's 'Taxonomy of Green Steel' -- India is the first country to publish such a taxonomy, aimed at decarbonizing the steel sector. (Portfolio: Steel)",
        "Launched the second round of the PLI Scheme for Specialty Steel. (Portfolio: Steel)",
        "Reiterated India's targets of 300 million tonnes of steel capacity by 2030 and 500 million tonnes by 2047, at the Bharat Steel 2026 conference. (Portfolio: Steel)",
        "Reaffirmed the Centre's commitment to strengthen SAIL as a globally competitive producer and announced progress on the IISCO Steel Plant (Burnpur) expansion. (Portfolio: Steel)",
        "Chaired a Consultative Committee meeting of the Ministry of Heavy Industries. (Portfolio: Heavy Industries)",
    ],
    "Hardeep Singh Puri": [
        "Delivered a parliamentary statement on measures to address global energy supply disruption from the West Asia conflict, including an LPG Control Order directing refineries to maximize LPG yield for domestic cooking gas.",
        "Said the government absorbed most of a required per-cylinder price adjustment, keeping the effective added cost for PMUY households under 80 paise a day.",
        "Announced the government increased commercial LPG allocation to 70% to prioritize key industries.",
        "At India Energy Week 2026, said sustained investment and strategic partnerships are essential to deliver a secure, affordable and sustainable energy transition.",
        "Said India holds 76-80 days of supply across ports, terminals, refineries and strategic reserves, while cautioning that a fall in crude prices would not translate to an immediate petrol/diesel price cut.",
    ],
    "Harsh Malhotra": [
        "Inaugurated the National Conference on Responsible Business Conduct (NCRBC) 2025. (Portfolio: Corporate Affairs)",
        "Called the 2026-27 Union Budget -- the first presented from the newly inaugurated Kartavya Bhawan -- a 'roadmap for Viksit Bharat 2047.' (Portfolio: Corporate Affairs)",
        "Laid the foundation stone for 5 vehicular underpasses in Kushinagar, Uttar Pradesh. (Portfolio: Road Transport and Highways)",
        "Reviewed key NHAI/MoRTH road infrastructure projects and decongestion initiatives for the National Capital. (Portfolio: Road Transport and Highways)",
        "At a Road and Highways Summit, cited highway network growth from 91,000 km in 2014 to over 1.46 lakh km, calling it the world's second-largest road network. (Portfolio: Road Transport and Highways)",
    ],
    "Jitin Prasada": [
        "Introduced the Jan Vishwas (Amendment of Provisions) Bill, 2026 in the Lok Sabha, proposing to amend 784 provisions -- 717 decriminalised for ease of doing business, 67 to ease living. (Portfolio: Commerce and Industry)",
        "Inaugurated the Global Business Research Conference 2026 at the Indian Institute of Foreign Trade. (Portfolio: Commerce and Industry)",
        "Delivered India's national statement at the UN General Assembly high-level meeting reviewing WSIS+20 outcomes. (Portfolio: Electronics and IT)",
        "Inaugurated the 4th India Internet Governance Forum, stating India's startup ecosystem spans 600+ districts with more than half women-led. (Portfolio: Electronics and IT)",
        "Addressed the AI Impact Festival, building momentum for the India-AI Impact Summit. (Portfolio: Electronics and IT)",
    ],
    "Jual Oram": [
        "Welcomed the 2026-27 Union Budget as transformational for tribal welfare, citing continued expansion of Eklavya Model Residential Schools and gains for tribal regions.",
        "Inaugurated Tribes Art Fest 2026, showcasing 30+ tribal art forms from 75 artists.",
        "Reviewed nationwide progress of Eklavya Model Residential School construction.",
        "Said tribal MPs are uniting to accelerate tribal development nationwide.",
    ],
    "Jyotiraditya Scindia": [
        "Announced telecom security reforms, including a 2-year extension of the Pro Tem Security Certification Scheme for equipment manufacturers. (Portfolio: Communications)",
        "Released revised guidelines for the Telecom Design-Led Manufacturing scheme with an outlay exceeding Rs 203 crore for 2026-31 to accelerate indigenous 5G-Advanced and 6G development. (Portfolio: Communications)",
        "Told the Lok Sabha 'BSNL belongs to the people of India,' ruling out privatisation and citing nearly 98,000 4G sites installed. (Portfolio: Communications)",
        "Virtually inaugurated 5 completed projects and laid foundation stones for 11 more, worth over Rs 645 crore, in the Northeast. (Portfolio: Development of North Eastern Region)",
    ],
    "Kamlesh Paswan": [
        "Reviewed PMAY-G (rural housing scheme) progress in Assam, where 29.09 lakh houses have been sanctioned statewide and 21.33 lakh completed.",
        "Conducted a comprehensive review of rural development scheme implementation in Chhattisgarh.",
        "Said rural scheme benefits must reach the last mile with transparency and time-bound delivery.",
        "Jointly launched SHE-LEAPS, a digital platform for rural women and self-help groups supporting the government's 6-crore 'Lakhpati Didi' target.",
    ],
    "Kinjarapu Ram Mohan Naidu": [
        "Inaugurated a stakeholder workshop on 'Modified UDAN,' the next phase of the regional air connectivity scheme, with a reported outlay of roughly Rs 29,000 crore aimed at developing 100 new airports and 200 helipads over the next decade.",
        "Marking 8 years of the UDAN scheme, cited 601 routes and 86 airports operationalized, benefiting 14.4 million passengers.",
        "Inaugurated the 2nd Asia-Pacific Ministerial Conference on Civil Aviation in New Delhi.",
        "Launched 'Yatri Sewa Diwas,' an initiative focused on passenger experience.",
        "At Wings India 2026, said the government is focused on building a domestic aviation manufacturing ecosystem.",
    ],
    "Kiren Rijiju": [
        "Stated the annual Minority Affairs budget has grown from Rs 1,949 crore in 2014 to Rs 4,115 crore, a roughly 111% increase. (Portfolio: Minority Affairs)",
        "Welcomed the Supreme Court's interim judgment on the Waqf Amendment Bill, stating the Bill had been passed after the longest debate in Parliament's history. (Portfolio: Minority Affairs)",
        "Urged opposition parties for cooperation to ensure smooth functioning of Parliament ahead of a winter session. (Portfolio: Parliamentary Affairs)",
        "Said the government was ready to discuss the NEET paper-leak case in Parliament and place all related details on record. (Portfolio: Parliamentary Affairs)",
    ],
    "Kirti Vardhan Singh": [
        "In a written Lok Sabha reply, stated the Central government provides capacity-building and financial support to State Forest Department staff to manage and mitigate human-wildlife conflict. (Portfolio: Environment, Forest and Climate Change)",
        "Told the Rajya Sabha the Centre acknowledges AI data-centre infrastructure's energy and water footprint, while noting key facilities currently remain outside the Environmental Impact Assessment mandate. (Portfolio: Environment, Forest and Climate Change)",
        "Represented India at the SCO Council of Foreign Ministers' meeting in Kyrgyzstan, held in preparation for the SCO Leadership Summit. (Portfolio: External Affairs)",
    ],
    "Krishan Pal Gurjar": [
        "Inaugurated the Bharat Organics Mela 2025 at the World Trade Centre, New Delhi, organized under the joint aegis of the Ministry of Cooperation and the Ministry of Agriculture and Farmers' Welfare.",
        "Stated the cooperative sector is projected to contribute roughly Rs 100 lakh crore to the country's economic development over the next five years.",
        "Described cooperatives as central to India's inclusive-growth strategy.",
    ],
    "L. Murugan": [
        "In a written Lok Sabha reply, stated that OTT content is governed by Part III of the IT Rules, 2021 -- a Code of Ethics for digital media publishers with a three-tier grievance mechanism -- since CBFC's statutory mandate does not extend to streaming platforms. (Portfolio: Information and Broadcasting)",
        "Told the Lok Sabha that roughly 50 OTT platforms were disabled for public access over a two-year period for hosting obscene content, acting on complaints under the IT Rules framework. (Portfolio: Information and Broadcasting)",
        "Unveiled the Government of India Calendar 2026, themed 'Bharat@2026: Sewa, Sushasan aur Samriddhi' (Service, Good Governance and Prosperity), describing it as reflecting governance priorities toward Viksit Bharat by 2047. (Portfolio: Information and Broadcasting)",
        "As Minister of State for Parliamentary Affairs, has moved procedural motions in the Rajya Sabha, including appointing members to Joint Committees on constitutional amendment bills. (Portfolio: Parliamentary Affairs)",
    ],
    "Lalan Singh": [
        "At the National Panchayati Raj Day event in Madhubani, Bihar, where the PM launched development projects worth over Rs 13,480 crore, highlighted digital tools such as eGramSwaraj as central to improving transparency and efficiency in rural local governance.",
        "Stated that fund devolution to Panchayati Raj Institutions has risen nearly sevenfold over the past decade compared with the 13th Finance Commission period, and that the Panchayati Raj devolution index rose from 39.9% in 2013-14 to 43.9% in 2021-22.",
        "In a February 2026 Lok Sabha written reply, said roughly 3.06 crore property cards had been prepared under the SVAMITVA Scheme, covering about 1.86 lakh villages.",
        "Under his ministry, the 16th Finance Commission allocated Rs 4,35,236 crore for Rural Local Bodies for the 2026-31 award period.",
        "Oversaw integration of the e-GramSwaraj platform with GeM (for transparent procurement), BSNL (connectivity), and BHASHINI (multilingual access) to strengthen panchayat-level digital governance.",
        "Presided over the National Panchayat Awards, conferred on outstanding panchayats at a New Delhi ceremony.",
    ],
    "Manohar Lal Khattar": [
        "Has stated India's target of 500 GW of non-fossil/renewable energy capacity by 2030, with the ministry's National Electricity Plan (Transmission) envisaging about 1,90,000 circuit km of new transmission lines and over Rs 9 lakh crore of investment to support growth to over 600 GW by 2032. (Portfolio: Power)",
        "Has projected India's power demand will reach 708 GW by 2047, requiring installed capacity to grow roughly fourfold to about 2,100 GW, and has called for stronger inter-state transmission infrastructure during state review visits. (Portfolio: Power)",
        "Launched the Dumpsite Remediation Accelerator Programme (DRAP), targeting 'Zero Dumpsites' by 2026 and reclamation of an estimated 7,580 acres of landfill land. (Portfolio: Housing and Urban Affairs)",
        "Launched the Urban Investment Window (UIWIN) through HUDCO to facilitate private and multilateral investment in PPP urban infrastructure projects. (Portfolio: Housing and Urban Affairs)",
        "Under PMAY-Urban 2.0, relaunched under his ministry, the government targets housing assistance of up to Rs 2.5 lakh per household for an additional 1 crore urban families by 2029. (Portfolio: Housing and Urban Affairs)",
        "Unveiled the official logo and website of the PM-eBus Sewa Scheme; the ministry reported 3,622 buses sanctioned during calendar year 2025 with Rs 60.73 crore allocated for associated infrastructure. (Portfolio: Housing and Urban Affairs)",
    ],
    "Mansukh L. Mandaviya": [
        "Oversaw the operationalisation of India's four new Labour Codes, effective November 21, 2025, consolidating 29 prior labour laws, with full rule notification and expanded social-security coverage targeted for around April 2026. (Portfolio: Labour and Employment)",
        "Chaired the 239th meeting of the EPFO Central Board of Trustees, which recommended an 8.25% interest rate on EPF deposits for FY 2025-26. (Portfolio: Labour and Employment)",
        "Launched EPFO's Employees' Enrolment Scheme-2025 at EPFO's 73rd Foundation Day, and was conferred the ISSA Award 2025 for expanding social-security coverage from 19% of the population in 2015 to 64.3% in 2025 (over 940 million people). (Portfolio: Labour and Employment)",
        "Ministry has stated plans to roll out 'EPFO 3.0' in 2026, intended to speed up PF withdrawals, pension fixation, and insurance-claim processing. (Portfolio: Labour and Employment)",
        "At the Khelo Bharat Conclave, set a goal for India to finish in the top 10 nations at the 2036 Olympics, introducing a three-tier talent pipeline under a 10-year plan split into 2026-31 and 2031-36 phases, alongside a shift toward performance-based grants for National Sports Federations. (Portfolio: Youth Affairs and Sports)",
        "Has cited the MY Bharat digital youth platform surpassing 2 crore registrations and announced state-level editions of the Viksit Bharat Young Leaders Dialogue (VBYLD) alongside the national event. (Portfolio: Youth Affairs and Sports)",
    ],
    "Murlidhar Mohol": [
        "Has championed the Modified UDAN regional-connectivity scheme's decade-long extension, saying it will strengthen infrastructure, viability support, and last-mile connectivity to Tier-II/III and remote locations. (Portfolio: Civil Aviation)",
        "Inaugurated a new ATC Tower cum Technical Block cum Fire Station at Kolhapur Airport and flagged off the inaugural Star Air flight between Kolhapur and Nagpur. (Portfolio: Civil Aviation)",
        "Has promoted eVTOL policy, sustainable aviation fuel adoption, and helicopter-sector growth, hosting the 7th Helicopter and Small Aircraft Summit in Pune, and said land transfer for Pune's first dedicated heliport was nearing completion. (Portfolio: Civil Aviation)",
        "Has backed the computerization of roughly 67,930 Primary Agricultural Credit Societies (PACS) to improve transparency and access to loans and direct benefit transfers. (Portfolio: Cooperation)",
        "Has supported a roughly Rs 1.25 lakh crore cooperative-sector plan to build 700 lakh tonnes of grain storage capacity via PACS-run godowns over five years. (Portfolio: Cooperation)",
        "Has called for AI-driven leadership training for the cooperative sector at Tribhuvan Sahkari University, India's first national university dedicated to cooperatives. (Portfolio: Cooperation)",
    ],
    "Narendra Modi": [
        "Has articulated 'Viksit Bharat @2047' as the overarching governance vision -- India becoming a developed nation by its 100th year of independence -- built around four groups (Yuva, Garib, Mahilayen, Annadata) and pillars including manufacturing, green energy, and global positioning of Indian products.",
        "In his 79th Independence Day address (15 August 2025), announced 'next-generation GST reforms' delivered by Diwali 2025 to cut taxes on daily-use goods, benefiting the common man, farmers, MSMEs, the middle class, women and youth.",
        "Announced the PM Viksit Bharat Rozgar Yojana, a Rs 1 lakh crore employment-linked scheme paying Rs 15,000 to first-time private-sector job seekers, targeting roughly 3-3.5 crore youth, rolled out from 1 August 2025.",
        "In the same Independence Day address, announced 'Mission Sudarshan Chakra,' a national security and defence initiative, as part of a broader self-reliance framing.",
        "His government passed the VB-G RAM-G Bill in early 2026, renaming and restructuring MGNREGA as the 'Viksit Bharat - Guarantee for Rozgar and Ajeevika Mission Gramin,' amid opposition protest in Parliament.",
    ],
    "Nimuben Bambhaniya": [
        "Informed the Lok Sabha that 99.7% of ration cards nationally have been linked with Aadhaar and 99.8% of Fair Price Shops are equipped with electronic Point of Sale devices, as part of PDS digitization.",
        "Visited Asia's largest grain market, in Khanna and Rajpura, Punjab, to review wheat procurement arrangements.",
        "Inspected Food Corporation of India facilities in Ahmedabad and led a plantation drive at FCI's Narela depot to mark World Environment Day 2025.",
        "During visits to Nagaland and Meghalaya, reviewed food distribution schemes and Fair Price Shop implementation in the Northeast.",
    ],
    "Nirmala Sitharaman": [
        "In the Union Budget 2025-26 speech, announced no income tax payable up to Rs 12 lakh annual income under the new tax regime (effectively Rs 12.75 lakh with standard deduction), stating this would mean roughly 9 out of 10 taxpayers pay zero income tax. (Portfolio: Finance)",
        "Steered the 'next-generation GST reforms' (GST 2.0) at the 56th GST Council meeting, collapsing the four-rate structure into two main slabs (5% and 18%) plus a 40% rate for select luxury and sin goods, effective 22 September 2025, projected to inject roughly Rs 2 lakh crore into the economy. (Portfolio: Finance)",
        "In the Union Budget 2026-27 speech, projected a fiscal deficit of 4.3% of GDP for FY27, raised public capital expenditure to Rs 12.2 lakh crore, and proposed a Semiconductor Mission 2.0 and dedicated Rare Earth Corridors. (Portfolio: Finance)",
        "Has championed the new Income Tax Act, 2025 (effective 1 April 2026), saying it reduces disputes and compliance costs by condensing the law from 819 to 536 sections. (Portfolio: Finance)",
        "As Corporate Affairs Minister, moved the Insolvency and Bankruptcy Code (Amendment) Bill, 2025, passed in March 2026, introducing a creditor-initiated, out-of-court fast-track insolvency framework and cross-border insolvency provisions. (Portfolio: Corporate Affairs)",
        "In the FY26 Budget, proposed raising the FDI limit in the insurance sector from 74% to 100% for companies reinvesting the full premium in India. (Portfolio: Finance)",
    ],
    "Nitin Gadkari": [
        "Launched the revamped RAJMARG PRAVESH web portal to speed up and digitize No Objection Certificate approvals for fuel stations, wayside amenities, rest areas, and connecting roads along National Highways.",
        "Set a road-safety target of cutting road accident deaths by 50% by 2030 and moving toward zero fatalities by 2040 under a 'Vision Zero' push, announcing mandatory active-safety features (ABS, lane-departure warning, driver-drowsiness alerts, blind-spot monitoring) in medium and heavy vehicles and a Centre of Excellence for Road Safety at IIT Madras.",
        "Announced satellite/GNSS-based toll collection to replace physical toll plazas nationwide by end-2026, projecting Rs 1,500 crore in fuel savings and Rs 6,000 crore in added government revenue, and introduced a FASTag-based Annual Pass priced at Rs 3,000 from August 15, 2025.",
        "Approved regulations legally authorizing 100% ethanol fuel use in vehicles, and has pushed automakers toward flex-fuel and alternative-fuel (electric, methanol, hydrogen) engines to cut fossil-fuel imports.",
        "Set a construction-pace target of 60 km of national highway per day; as of February 2026, 22,223 km of the 26,425 km awarded under Bharatmala Pariyojana had been constructed.",
        "In his Nagpur constituency, committed to planting 2.5 million trees under a 'Green Nagpur' initiative.",
    ],
    "Nityanand Rai": [
        "In the Rajya Sabha, stated a target for India to be free of Left-Wing Extremism by March 2026, citing a 90% drop in LWE-related deaths (1,005 in 2010 to 100 in 2025) and an 88% drop in incidents (1,936 to 234) since 2010.",
        "Introduced the Foreign Contribution (Regulation) Amendment Bill, 2026 in the Lok Sabha, stating its objective is to make the use of foreign contributions by NGOs and institutions more transparent and accountable.",
        "Told the Lok Sabha the government has no plans to create a separate Ministry or Department of Union Territory Affairs, nor to form a Parliamentary Inspection Committee on Union Territories.",
        "In a written Rajya Sabha reply, acknowledged that Pakistan-linked networks are using narcotics smuggling in Jammu and Kashmir and Punjab, including drone-based drug airdrops across the border, as a financing channel for terrorist groups.",
        "Has pointed to Cyber Forensic Labs and the Police Technology Mission as initiatives to strengthen police capacity to tackle cybercrime.",
        "During a visit to Mizoram, said India's overall development depends significantly on Northeast development, and assured that any decision on the India-Myanmar Free Movement Regime would take Mizoram's interests into account.",
    ],
    "Pabitra Margherita": [
        "In a Lok Sabha written reply, said the Ministry of Textiles has set a target of Rs 9 lakh crore in textile and apparel exports by 2030, up from about $37.75 billion in FY 2024-25. (Portfolio: Textiles)",
        "Told the Rajya Sabha India aims for Rs 87,450 crore in technical textile exports under the National Technical Textiles Mission, extended to 2025-26 with a Rs 1,480 crore outlay. (Portfolio: Textiles)",
        "Gave updates on the PLI Scheme for Textiles (170 companies approved, Rs 8,117.64 crore in cumulative investment and 33,427 jobs generated as of March 31, 2026) and the seven PM MITRA textile parks, a Rs 4,445 crore outlay each projected to draw about Rs 10,000 crore in investment. (Portfolio: Textiles)",
        "At Bharat Tex 2026, framed 'Style, Scale, Skill and Sustainability' as the sector's guiding pillars and reaffirmed the government's push to grow textile exports to $100 billion by 2030. (Portfolio: Textiles)",
        "In a Lok Sabha written reply, said India's 35.4 million-strong overseas diaspora is a strategic economic and soft-power asset, citing outreach in the Gulf/MENA/Mediterranean region and initiatives such as I2U2 (India-Israel-UAE-USA) covering water, energy, transport, space, health and food security cooperation. (Portfolio: External Affairs)",
        "Said the Ministry of Textiles has formulated a 40-country market diversification strategy for textile exports, using Export Promotion Councils, industry delegations and Indian missions abroad to pursue new markets. (Portfolio: Textiles)",
    ],
    "Pankaj Chaudhary": [
        "In a written reply to the Rajya Sabha, stated that as of July 1, 2026, total Pradhan Mantri Jan Dhan Yojana accounts reached 58.63 crore with deposits exceeding Rs 3.08 lakh crore, with 55.74% of accounts held by women and 77.80% opened in rural/semi-urban areas. (Portfolio: Financial Services)",
        "In a Lok Sabha statement, disclosed that as of July 31, 2025, more than 23% (roughly 13 crore) of PMJDY accounts remained inactive despite the scheme's continued expansion. (Portfolio: Financial Services)",
        "Inaugurated the GST Bhawan complex at Nangal Raya, Delhi, stating the integrated GST system had simplified the indirect tax framework and broadened the tax base. (Portfolio: Revenue/GST)",
        "In a written reply to the Lok Sabha, stated that 1,30,638 income-tax refund cases worth Rs 340.30 crore were on hold due to inoperative PAN status. (Portfolio: Revenue/Income Tax)",
        "Presided over the Passing Out Parade of the 74th batch of Indian Revenue Service (Customs and Indirect Taxes) officers at Palasamudram. (Portfolio: Revenue)",
    ],
    "Pemmasani Chandra Sekhar": [
        "On BSNL's indigenous 4G rollout, stated that as of February 28, 2026, 97,906 4G sites had been installed nationwide, calling India the fifth country globally to develop deep indigenous 4G technology. (Portfolio: Communications)",
        "Stated BSNL's revenue grew from roughly Rs 21,000 crore to Rs 25,000 crore over two years, and noted the government has approved three BSNL revival packages worth a combined roughly Rs 3.22 lakh crore. (Portfolio: Communications)",
        "Addressing the Bharat 6G 2025 conference, said India deployed over 4.7 lakh 5G Base Transceiver Stations in two years, reaching roughly 80% population coverage. (Portfolio: Communications)",
        "During Lok Sabha Question Hour, stated that 4.12 crore houses had been allocated to states/UTs under Pradhan Mantri Awaas Yojana-Gramin, with 2.90 crore already constructed. (Portfolio: Rural Development)",
    ],
    "Piyush Goyal": [
        "The India-UK Free Trade Agreement became operational on July 15, 2026, giving 99% of Indian goods zero-duty access to the UK market; Goyal called it 'a bold and transformative step toward a developed India.' (Portfolio: Commerce)",
        "The India-EU FTA negotiations concluded on January 27, 2026 after nearly two decades of talks, with the agreement expected to enter into force in early 2027; Goyal called it a 'fair, balanced, win-win' deal. (Portfolio: Commerce)",
        "On the India-US trade deal, said by late June 2026 that negotiations were largely concluded, cutting tariffs from 50% to 18%, though the deal remained unsigned pending formal terms. (Portfolio: Commerce)",
        "Stated India is targeting 16-17% growth in merchandise exports to about $530 billion in the current fiscal year, alongside roughly 11% growth in services exports. (Portfolio: Commerce)",
        "Chairing a review meeting on the Production-Linked Incentive scheme, cited Rs 1.76 trillion in investment attracted across 14 sectors and over 1.2 million jobs created as of March 2025, while calling for a five-year roadmap on investment and disbursement. (Portfolio: Industry)",
        "Launched Integrated State and City Logistics Plans across 8 cities to reduce industry logistics costs, building on the National Logistics Policy and PM GatiShakti framework. (Portfolio: Industry)",
    ],
    "Rajnath Singh": [
        "Released 'Defence Forces Vision 2047: A Roadmap for a Future-Ready Indian Military' (March 10, 2026), emphasizing jointness among the Services, indigenous technology adoption, and modern training frameworks for Viksit Bharat by 2047.",
        "Released the Delegation of Financial Powers to DRDO (DFP-2026) and a revised Delegation of Financial Powers for Defence Services, raising financial powers by up to 100% in some categories to speed up procurement and R&D execution.",
        "At the 'Sagar Sankalp' maritime dialogue, cited government plans for roughly Rs 3 lakh crore in investment to build world-class shipbuilding clusters, with a goal of India reaching the top 10 shipbuilding nations by 2030 and top 5 by 2047, and a target of Rs 29,000 crore in defence exports by April 2026.",
        "Has cited India's defence indigenisation drive -- five Positive Indigenisation Lists for the Armed Forces (509 items) and five more for Defence PSUs (5,012 items) -- with annual defence production reaching an estimated Rs 1.78 lakh crore in FY2025-26, up from about Rs 40,000 crore in 2013-14, and a stated production target of Rs 3 lakh crore by 2029.",
        "Cited 676 startups and innovators engaged through the iDEX defence-innovation program as of March 2026, with 551 contracts signed and over Rs 2,400 crore in procurement approved from startups and MSMEs.",
    ],
    "Raksha Khadse": [
        "Chaired a meeting with Government of India and Government of Maharashtra officials to develop a roadmap for strengthening Maharashtra's sports and youth development ecosystem.",
        "Announced the nationwide 'Khelo India ASMITA League,' a joint Khelo India and MY Bharat initiative described as affirmative action in sports to increase women's participation.",
        "Described Khelo India Tribal Games as building champions from India's tribal heartland, positioning the initiative as a platform for grassroots talent identification and tribal empowerment through sport.",
        "Called the Khelo India Multipurpose Hall at SAI Chhatrapati Sambhajinagar a crucial addition to Maharashtra's Olympic readiness.",
        "Said programs including Khelo India, TOPS (Target Olympic Podium Scheme), Fit India and ASMITA are together building a robust sporting ecosystem under the government's direction.",
        "Highlighted esports' growth potential at the Battlegrounds Mobile India Pro Series (BMPS) 2025 Grand Finals.",
    ],
    "Ram Nath Thakur": [
        "In a written reply to the Lok Sabha, stated there is currently no proposal under consideration to increase the PM-KISAN benefit amount (Rs 6,000/year, paid in three instalments via DBT) above its existing level.",
        "Informed Parliament that as of December 31, 2025, over 104,000 farmers in Kangra district, Himachal Pradesh, were availing loans through the Kisan Credit Card scheme, and noted RBI raised the collateral-free KCC loan limit from Rs 1.6 lakh to Rs 2 lakh effective January 1, 2025.",
        "Reviewed implementation of the 'Khet Bachao Abhiyan' in the Pune region, urging farmers to reduce indiscriminate chemical fertilizer use and adopt natural/organic farming to prevent land degradation.",
        "Visited AI-driven agriculture facilities at KVK Baramati to review technology adoption in farming.",
        "Has urged expanding coverage of central farmer welfare schemes, including in Meghalaya, to reach a larger number of beneficiary farmers.",
    ],
    "Prahlad Joshi": [
        "Stated that Food Corporation of India foodgrain stocks reached 604.02 lakh tonnes as of April 1, 2026 -- nearly three times the mandatory buffer requirement -- citing this as evidence of strong food security. (Portfolio: Consumer Affairs, Food and Public Distribution)",
        "Directed e-commerce companies to self-audit and remove 'dark patterns' after the ministry identified 13 categories of such deceptive design practices, and launched the Jago Grahak Jago app, Jagriti app, and Jagriti Dashboard to support consumer grievance redressal. (Portfolio: Consumer Affairs)",
        "Announced India's target of achieving indigenous solar cell manufacturing by 2028, extending domestic capability upstream to wafers and ingots rather than modules alone. (Portfolio: New and Renewable Energy)",
        "Set a target of 75 lakh rooftop solar installations by December 2026 under PM Surya Ghar: Muft Bijli Yojana, stating over 1 crore households had registered on the national portal by the scheme's two-year mark. (Portfolio: New and Renewable Energy)",
        "Stated India ranks third globally in installed renewable energy capacity, with non-fossil fuel capacity reaching 283.46 GW as of March 31, 2026, against the national target of 500 GW by 2030. (Portfolio: New and Renewable Energy)",
    ],
    "Prataprao Ganpatrao Jadhav": [
        "Inaugurated the two-day 'Ayush Chintan Shivir 2026' in New Delhi, calling for an action-oriented roadmap for the sector including deeper institutional integration of Ayush with mainstream healthcare and expanded digital health platforms. (Portfolio: Ayush)",
        "Welcomed the Union Budget 2026-27 allocation of roughly Rs 4,500 crore to the Ayush ministry, highlighting plans for three new All India Institutes of Ayurveda and upgrades to Ayush pharmacies and drug-testing laboratories. (Portfolio: Ayush)",
        "Proposed the expansion of Ayush OPDs into military and field hospitals nationwide, to integrate traditional medicine alongside modern defence healthcare infrastructure. (Portfolio: Ayush)",
        "Stated that government policy is shifting focus from OPD-based curative treatment toward promotive and preventive healthcare, citing roughly 12,500 Ayushman Arogya Mandirs established as evidence of this shift. (Portfolio: Health and Family Welfare)",
        "Inaugurated a renovated Unani Research Centre at JJ Hospital, Mumbai, and presided over Unani Day 2026 celebrations. (Portfolio: Ayush)",
    ],
    "Raj Bhushan Choudhary": [
        "Stated the Jal Jeevan Mission has been extended to 2028 with an additional outlay of about Rs 67,000 crore to ensure tap water for every rural household, noting rural piped-water coverage rose from about 17% before 2019 to over 80% today.",
        "In a written Rajya Sabha reply, stated that of 524 projects sanctioned under the Namami Gange Programme (total sanctioned cost Rs 43,030 crore), 355 projects (about 68%) had been completed, including 76 sewerage infrastructure projects with combined treatment capacity of 3,200 MLD.",
        "Provided Parliament details on the Atal Bhujal Yojana, a Rs 6,000 crore Central Sector Scheme (50:50 funded with the World Bank) for community-led groundwater management across more than 8,200 water-stressed gram panchayats in 7 states.",
    ],
    "S. P. Singh Baghel": [
        "In a written Lok Sabha reply, detailed central schemes supporting livestock farmers, dairy producers and fishermen, describing them as focused on employment generation, entrepreneurship development, and raising per-animal productivity. (Portfolio: Fisheries, Animal Husbandry and Dairying)",
        "Inaugurated the Fish Tech Pavilion of the Department of Fisheries at World Food India 2025, showcasing fisheries-sector technology and value-chain initiatives. (Portfolio: Fisheries, Animal Husbandry and Dairying)",
        "Released a report on devolution to Panchayats which found devolution to Rural Local Bodies had risen from 39.9% in 2013-14 to 43.9% in 2021-22, assessed across six dimensions including finances, functions and accountability. (Portfolio: Panchayati Raj)",
        "Presided over the launch of PANCHAM (Panchayat Assistance and Messaging Chatbot), a WhatsApp-based AI platform built with UNICEF intended to give over 30 lakh elected panchayat representatives direct access to scheme information and training support. (Portfolio: Panchayati Raj)",
        "Promoted the People's Plan Campaign for participatory Gram Panchayat Development Plans, and inaugurated a National Conference on the PESA (Panchayats Extension to Scheduled Areas) Act, 1996, alongside launch of the PESA-GPDP portal. (Portfolio: Panchayati Raj)",
    ],
    "Sanjay Seth": [
        "Took charge as Minister of State for Defence on June 11, 2024, stating he would work toward fulfilling ongoing Ministry of Defence initiatives aimed at strengthening national security.",
        "At a national seminar on India's neighbourhood, said India remains committed to the welfare of its neighbours while maintaining zero tolerance toward terrorism, citing Operation Sindoor and growing use of indigenously developed defence systems.",
        "Stated that India's defence exports rose from Rs 686 crore in 2014 to over Rs 23,000 crore in 2025, and that the defence budget has crossed Rs 7 lakh crore, citing this as progress under the government's self-reliance push in defence manufacturing.",
        "Inaugurated the two-day MSME Defence Conclave 2026 at Adityapur, Jharkhand, aimed at expanding MSME participation in defence manufacturing, noting that of India's roughly four crore MSMEs only about 16,000 are currently linked to the defence sector.",
        "Received Chief of Defence Staff General N. S. Raja Subramani for a review of India's defence preparedness and military modernisation.",
    ],
    "Sarbananda Sonowal": [
        "Welcomed the Union Budget 2025 announcement of a Rs 25,000 crore Maritime Development Fund, calling it a 'game-changer' for encouraging private investment in port and shipping infrastructure. (Portfolio: Ports, Shipping and Waterways)",
        "Launched the Cruise Bharat Mission, targeting 100 river cruise terminals, 10 sea/international cruise terminals and 5 marinas by 2029, aiming to grow cruise passenger traffic to 2.5 million and generate over 4 lakh jobs. (Portfolio: Ports, Shipping and Waterways)",
        "Launched digital maritime initiatives including the SAGAR SETU platform and an MoU with the Centre for Development of Advanced Computing to set up a Digital Centre of Excellence applying AI, IoT and blockchain to port operations. (Portfolio: Ports, Shipping and Waterways)",
        "Said India Maritime Week 2025 secured investment commitments of around Rs 12 lakh crore to strengthen the maritime sector under the Atmanirbhar Bharat push. (Portfolio: Ports, Shipping and Waterways)",
        "As Ayush Minister, announced a north-east package including 1,000 new Health and Wellness Centres under the National Ayush Mission, 100 new Ayush dispensaries, and Rs 70 crore for a new Ayurvedic college at Dudhnoi, Goalpara, Assam. (Portfolio: Ayush)",
        "Launched the 'Har Din Har Ghar Ayurveda' campaign, describing it as a push to take Ayurveda's health message into every Indian household. (Portfolio: Ayush)",
    ],
    "Rao Inderjit Singh": [
        "Has described how MoSPI's surveys and indices (GDP, CPI, IIP) support evidence-based policymaking, and that the ministry monitors India's National Indicator Framework for the Sustainable Development Goals. (Portfolio: Statistics and Programme Implementation)",
        "Announced that MoSPI released a trial series of India's first Index of Services Production, noting the services sector contributes nearly 53% of India's Gross Value Added. (Portfolio: Statistics and Programme Implementation)",
        "Informed Parliament that MoSPI has cut National Sample Survey data release timelines from 8-9 months down to 45-90 days through digital reforms, including CAPI tools, the e-SIGMA system, and AI-enabled chatbots. (Portfolio: Statistics and Programme Implementation)",
        "Noted that base years for GDP, the Index of Industrial Production, and the Consumer Price Index have been revised to align with updated data sources, as part of statistical modernization. (Portfolio: Statistics and Programme Implementation)",
    ],
    "S. Jaishankar": [
        "Led Operation Sindhu (June 18-27, 2025), evacuating over 4,400 Indian nationals from Iran and Israel via 19 special flights during the escalation between the two countries, and publicly thanked Iran's foreign minister for facilitating safe passage.",
        "Has repeatedly characterized India's 'Neighbourhood First' policy as a consultative, outcome-oriented, non-reciprocal approach built on credit lines, grants, and infrastructure support to neighboring countries.",
        "At the 3rd Global South Young Diplomats Forum, committed India to 'articulate, assert and amplify the voice of the Global South' in multilateral forums.",
        "During an April 2026 visit to Mauritius and the UAE, framed India's regional engagement under 'Vision MAHASAGAR,' an extension of the earlier SAGAR doctrine broadening India's Indian Ocean role from maritime security toward economic and geopolitical leadership.",
        "Has continued to articulate a 'multi-alignment' foreign policy doctrine, describing India's approach as pursuing issue-based coalitions to maximize national interest rather than fixed ideological blocs.",
        "At the Raisina Dialogue 2026, addressed a panel on the future of the Indian Ocean alongside counterparts from Seychelles, Mauritius, and Sri Lanka.",
    ],
    "Satish Chandra Dubey": [
        "Championed the Rs 37,500 crore Coal Gasification Incentive Scheme, describing it as a landmark initiative to draw investment into coal gasification technology and value-added coal products; the scheme is open to private players, who receive a 30-year coal linkage for raw material security. (Portfolio: Coal)",
        "Chaired a high-level review of the Revised Jharia Master Plan, stating that rehabilitation would only be deemed successful once townships have roads, transport, hospitals, schools and police stations in place on schedule. (Portfolio: Coal)",
        "Called for India to attain self-reliance in critical minerals while reviewing the Indian Bureau of Mines' functioning, and jointly launched the 7th and 8th tranches of critical and strategic mineral block auctions in 2026. (Portfolio: Mines)",
        "Oversaw a CMPDI-MECL memorandum of understanding to strengthen cooperation on coal and mineral exploration for both energy and non-energy minerals. (Portfolio: Coal/Mines)",
        "Reviewed operations at South Eastern Coalfields Ltd and Eastern Coalfields Ltd and laid foundation stones for CCL's Karo and Kargali coal handling plants in Jharkhand. (Portfolio: Coal)",
    ],
    "Savitri Thakur": [
        "Delivered India's national intervention at the 70th Session of the UN Commission on the Status of Women in New York, highlighting India's 'women-led development' approach and citing over 100 million women organised into nearly 9 million Self-Help Groups.",
        "Told the Lok Sabha that approval has been given to upgrade 2 lakh Anganwadi Centres into 'Saksham Anganwadis' for improved nutrition delivery and Early Childhood Care and Education services.",
        "Defended the Poshan Tracker application's data-protection safeguards in response to privacy concerns, and highlighted that the app had achieved 97% Face Recognition System coverage for real-time monitoring of Anganwadi services.",
        "Conducted review meetings on implementation of centrally sponsored schemes -- Poshan Abhiyan, Mission Shakti and Mission Vatsalya -- in states including Meghalaya.",
    ],
    "Shantanu Thakur": [
        "Chaired a review of Sagarmala 2.0 and the Sagarmala Finance Corporation, focused on expediting port-led industrialisation projects, multimodal connectivity, and coastal infrastructure.",
        "Stated India is on track to become a top global shipping centre by 2047, noting port capacity has more than doubled and turnaround time at major ports has dropped substantially over the past decade.",
        "Highlighted a target for India to capture a 5% share of the global shipbuilding market by 2030, backed by a national shipbuilding policy and 10 planned world-class shipyards.",
        "Discussed the Maritime Amrit Kaal Vision 2047, under which the government plans roughly Rs 3 lakh crore of investment in shipbuilding clusters, including six planned clusters and 11 standalone shipyards at coastal locations.",
        "Said the government aims for 30% of India's shipping fleet to run on LNG, methanol or hydrogen by 2047 as part of a clean-fuel shipping push.",
    ],
    "Shivraj Singh Chouhan": [
        "Chaired the National Rural Development Conference 2026 ('Rashtriya Gramin Vikas Sammelan') under the theme 'Viksit Gram, Viksit Bharat,' bringing together state Rural Development ministers to build a shared Centre-state roadmap. (Portfolio: Rural Development)",
        "Noted that the Viksit Bharat-GRAM-G Act, 2025 raised the statutory rural wage-employment guarantee to 125 days and increased the Centre's contribution to nearly Rs 95,000 crore, up from Rs 86,000 crore under the earlier MGNREGA framework. (Portfolio: Rural Development)",
        "Outlined the Kharif Campaign 2026 roadmap at the National Agriculture Conference, setting a foodgrain output target of 362.5 million tonnes for the 2025-26 rabi season. (Portfolio: Agriculture and Farmers Welfare)",
        "Announced work under the Self-Reliance in Pulses Mission to procure the entire pre-registered marketable surplus of tur, urad and masoor at Minimum Support Price, aiming for full self-reliance in pulses by 2030-31. (Portfolio: Agriculture and Farmers Welfare)",
        "Cleared a roughly Rs 15,000 crore Kharif procurement plan and announced NABARD/bank-run village-level camps to expand Kisan Credit Card coverage under the PM Dhan-Dhaanya Krishi Yojana, which raised KCC loan limits from Rs 3 lakh to Rs 5 lakh for an estimated 7.7 crore farmers, fishers and dairy producers. (Portfolio: Agriculture and Farmers Welfare)",
    ],
    "Shobha Karandlaje": [
        "In a written reply to the Lok Sabha, said the four Labour Codes, which consolidate 29 existing central labour laws and came into force on November 21, 2025, mandate appointment letters, universal minimum wages, and extend rights and social security coverage to gig, platform, and interstate migrant workers. (Portfolio: Labour and Employment)",
        "Has stated that the new labour codes are designed to extend EPFO and ESI social security benefits to nearly 90% of workers in the unorganised sector. (Portfolio: Labour and Employment)",
        "Has chaired regional consultative meetings with southern and north-eastern state governments on labour law reform implementation and employment generation. (Portfolio: Labour and Employment)",
        "In a Lok Sabha written reply, cited Udyam Registration data showing MSMEs in India now report over 8 crore jobs, with Uttar Pradesh leading among states. (Portfolio: MSME)",
        "Has inaugurated MSME entrepreneurship and skill-development programmes run by the National Institute for MSME, including sessions on AI, digital marketing, and commercialisation of rural innovations. (Portfolio: MSME)",
    ],
    "Sukanta Majumdar": [
        "As MoS Education, has stated the National Education Policy 2020 lays the foundation for inclusive, skill-centric, future-ready education aimed at nation-building. (Portfolio: Education)",
        "Inaugurated a UGC workshop for vice-chancellors on writing undergraduate textbooks in Indian languages, part of the ASMITA project, a joint UGC-Bharatiya Bhasha Samiti effort to produce higher-education material in 12 Indian languages. (Portfolio: Education)",
        "Inaugurated a national workshop on Multi-Disciplinary Education and Research Universities held under the PM-USHA scheme. (Portfolio: Education)",
        "As MoS DoNER, has chaired review meetings on the PM-DevINE scheme (Rs 6,600 crore outlay for 2022-23 to 2025-26) and reviewed North Eastern infrastructure projects worth roughly Rs 3,108 crore. (Portfolio: DoNER)",
        "Has promoted the UNNATI (Uttar Poorva Transformative Industrialization) Scheme, 2024, and North East Trade and Investment roadshows intended to attract industrial investment into the region. (Portfolio: DoNER)",
    ],
    "Tokhan Sahu": [
        "In a Lok Sabha written reply, said over 1.64 crore houses have been sanctioned under PM Awas Yojana-Urban since its launch, with more than 98 lakh completed and handed over to beneficiaries.",
        "Attended the launch of the Angikaar 2025 outreach campaign under PMAY-U 2.0, intended to raise awareness of scheme benefits including the Credit Risk Guarantee Fund Trust for Low Income Housing.",
        "In a written Lok Sabha reply, said 7,636 projects worth about Rs 1.53 lakh crore had been completed under the Smart Cities Mission across 100 cities as of end-July 2025.",
        "In Rajya Sabha and Lok Sabha replies, detailed state-wise allocations under the PM-eBus Sewa scheme, including 750 electric buses sanctioned across 10 Karnataka cities and 347 buses for four Punjab cities.",
        "Presided over the concluding session of the National Urban Conclave 2025 at Yashobhoomi, New Delhi, which produced action points for India's roadmap toward inclusive, resilient, well-governed cities.",
    ],
    "V. Somanna": [
        "In a Lok Sabha written reply, said that as of February 10, 2026, around 15.69 crore (81.02%) of India's 19.36 crore rural households have tap-water connections under the Jal Jeevan Mission, with more than 2.72 lakh villages achieving 100% household coverage. (Portfolio: Jal Shakti)",
        "As Railways MoS, has announced the launch and extension of multiple Vande Bharat Express services in Karnataka, including Bengaluru-Mangaluru and Bengaluru-Dharwad-Belagavi routes, and confirmed plans for quadruple railway corridors around Bengaluru. (Portfolio: Railways)",
        "Has held review meetings with local MPs, MLAs, and railway officials on project status in Tumakuru, Chitradurga, and Davangere, and inspected the Rail Wheel Factory and the Bengaluru Suburban Railway Project. (Portfolio: Railways)",
        "Has inspected railway connectivity works to industrial nodes and other rail infrastructure, including at Thimmarajanahalli and Banaras Locomotive Works. (Portfolio: Railways)",
    ],
}


def update_manifesto_points(points_by_name: dict[str, list[str]]) -> None:
    with engine.begin() as conn:
        for name, points in points_by_name.items():
            result = conn.execute(text("""
                UPDATE ministers
                SET manifesto_points = :points
                WHERE minister_name = :name
            """), {"name": name, "points": points})
            if result.rowcount == 0:
                print(f"WARNING: no ministers row matched minister_name={name!r}")
            else:
                print(f"{name}: {result.rowcount} row(s) updated")


def main() -> None:
    update_manifesto_points(MANIFESTO_POINTS)


if __name__ == "__main__":
    main()
