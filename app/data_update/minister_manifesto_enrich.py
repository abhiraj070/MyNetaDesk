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
