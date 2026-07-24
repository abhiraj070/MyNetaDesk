"""
Populate the `chief_ministers` table -- one row per Indian state/UT that
currently has a sitting Chief Minister (28 states + Delhi + Puducherry +
Jammu & Kashmir, as of 2026-07-23; a state under President's Rule with no
sitting CM is simply omitted rather than given a placeholder row).

This is a brand-new, additive table -- it does not touch `mps`, `mlas`, or
`ministers` in any way. `state_key` uses the exact same ALL-CAPS format
already stored on `mps.state_key` (e.g. "MAHARASHTRA", "DELHI") so a future
location-resolution query can join straight through
`parliamentary_constituencies.state_key` without any extra normalization.

Data was hand-verified against Wikipedia (each CM's own page + their state's
"List of Chief Ministers" page) rather than scraped, since -- unlike the
Union Council of Ministers -- there's no single template/page covering all
31 in one fetch. Slap/rose counts always start at 0 for a state not seen
before; re-running this script never resets an existing state's tally (see
`upsert_chief_ministers`).

Run from the app/ directory:
    cd app && python -m data_update.chief_minister_update
"""
from sqlalchemy import text

from db.connect import engine

# Each entry: name, state (Title Case, for display), state_key (ALL CAPS,
# matching mps.state_key), party, designation, photo_url.
#
# Verified 2026-07-23 against each CM's own Wikipedia page/infobox plus,
# for the five entries that overturn a pre-2026 expectation (Bihar,
# Karnataka, Kerala, Tamil Nadu, West Bengal), at least one independent
# second source (Britannica / a national newswire / a state government
# broadcaster). Party is stored as the common abbreviation, matching the
# convention already used on `mps.party` (not the full name, which is what
# `ministers.party` inconsistently uses instead).
ROSTER = [
    {"name": "N. Chandrababu Naidu", "state": "Andhra Pradesh", "state_key": "ANDHRA PRADESH", "party": "TDP", "designation": "Chief Minister of Andhra Pradesh", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/a/a8/The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg"},
    {"name": "Pema Khandu", "state": "Arunachal Pradesh", "state_key": "ARUNACHAL PRADESH", "party": "BJP", "designation": "Chief Minister of Arunachal Pradesh", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/2/2b/Pema_Khandu_in_2018.jpg"},
    {"name": "Himanta Biswa Sarma", "state": "Assam", "state_key": "ASSAM", "party": "BJP", "designation": "Chief Minister of Assam", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Himanta_Biswa_Sarma_in_2026.jpg/500px-Himanta_Biswa_Sarma_in_2026.jpg"},
    {"name": "Samrat Choudhary", "state": "Bihar", "state_key": "BIHAR", "party": "BJP", "designation": "Chief Minister of Bihar", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Samrat_Chaudhary_giving_speech_in_2026.jpg/500px-Samrat_Chaudhary_giving_speech_in_2026.jpg"},
    {"name": "Vishnu Deo Sai", "state": "Chhattisgarh", "state_key": "CHHATTISGARH", "party": "BJP", "designation": "Chief Minister of Chhattisgarh", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/a/a4/Vishnu_Deo_Sai%2C_Chief_Minister_of_Chhattisgarh.jpg"},
    {"name": "Rekha Gupta", "state": "Delhi", "state_key": "DELHI", "party": "BJP", "designation": "Chief Minister of Delhi", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/7/72/Chief_Minister_of_Delhi%2C_Smt._Rekha_Gupta.jpg"},
    {"name": "Pramod Sawant", "state": "Goa", "state_key": "GOA", "party": "BJP", "designation": "Chief Minister of Goa", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Pramod_Sawant_at_the_inauguration_of_the_Chhatrapati_Shivaji_Maharaj_Chair_in_Goa_University_%28cropped%29.jpg/500px-Pramod_Sawant_at_the_inauguration_of_the_Chhatrapati_Shivaji_Maharaj_Chair_in_Goa_University_%28cropped%29.jpg"},
    {"name": "Bhupendra Patel", "state": "Gujarat", "state_key": "GUJARAT", "party": "BJP", "designation": "Chief Minister of Gujarat", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Bhupendra_Patel_%28cropped%29.jpg"},
    {"name": "Nayab Singh Saini", "state": "Haryana", "state_key": "HARYANA", "party": "BJP", "designation": "Chief Minister of Haryana", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/b/b7/Nayab_Singh_Saini_October_2024.jpg"},
    {"name": "Sukhvinder Singh Sukhu", "state": "Himachal Pradesh", "state_key": "HIMACHAL PRADESH", "party": "INC", "designation": "Chief Minister of Himachal Pradesh", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Sukhvinder_Singh_Sukhu.jpg/500px-Sukhvinder_Singh_Sukhu.jpg"},
    {"name": "Omar Abdullah", "state": "Jammu and Kashmir", "state_key": "JAMMU AND KASHMIR", "party": "JKNC", "designation": "Chief Minister of Jammu and Kashmir", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/6/68/Omar_Abdullah%2C_Chief_Minister_of_Jammu_%26_Kashmir.jpg"},
    {"name": "Hemant Soren", "state": "Jharkhand", "state_key": "JHARKHAND", "party": "JMM", "designation": "Chief Minister of Jharkhand", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/8/89/Hemant_Soren_01.jpg"},
    {"name": "D. K. Shivakumar", "state": "Karnataka", "state_key": "KARNATAKA", "party": "INC", "designation": "Chief Minister of Karnataka", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Dkshivakumar.png/500px-Dkshivakumar.png"},
    {"name": "V. D. Satheesan", "state": "Kerala", "state_key": "KERALA", "party": "INC", "designation": "Chief Minister of Kerala", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/6/65/VD_Satheesan.jpg"},
    {"name": "Mohan Yadav", "state": "Madhya Pradesh", "state_key": "MADHYA PRADESH", "party": "BJP", "designation": "Chief Minister of Madhya Pradesh", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/5/58/Mohan_Yadav%2C_Chief_Minister_of_Madhya_Pradesh.jpg"},
    {"name": "Devendra Fadnavis", "state": "Maharashtra", "state_key": "MAHARASHTRA", "party": "BJP", "designation": "Chief Minister of Maharashtra", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/b/be/Shri_Devendra_Gangadharrao_Fadnavis.jpg"},
    {"name": "Yumnam Khemchand Singh", "state": "Manipur", "state_key": "MANIPUR", "party": "BJP", "designation": "Chief Minister of Manipur", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/f/fc/YumnamKhemchandSingh_%28cropped%29.webp"},
    {"name": "Conrad Sangma", "state": "Meghalaya", "state_key": "MEGHALAYA", "party": "NPP", "designation": "Chief Minister of Meghalaya", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Conrad_Sangma_%28cropped%29.jpg/500px-Conrad_Sangma_%28cropped%29.jpg"},
    {"name": "Lalduhoma", "state": "Mizoram", "state_key": "MIZORAM", "party": "ZPM", "designation": "Chief Minister of Mizoram", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Lalduhoma.jpg/500px-Lalduhoma.jpg"},
    {"name": "Neiphiu Rio", "state": "Nagaland", "state_key": "NAGALAND", "party": "NPF", "designation": "Chief Minister of Nagaland", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Neiphiu_Rio.jpg/500px-Neiphiu_Rio.jpg"},
    {"name": "Mohan Charan Majhi", "state": "Odisha", "state_key": "ODISHA", "party": "BJP", "designation": "Chief Minister of Odisha", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Shri_Mohan_Charan_Majhi.jpg/500px-Shri_Mohan_Charan_Majhi.jpg"},
    {"name": "N. Rangaswamy", "state": "Puducherry", "state_key": "PUDUCHERRY", "party": "AINRC", "designation": "Chief Minister of Puducherry", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/N._Rangaswamy_%28cropped%29.jpg/500px-N._Rangaswamy_%28cropped%29.jpg"},
    {"name": "Bhagwant Mann", "state": "Punjab", "state_key": "PUNJAB", "party": "AAP", "designation": "Chief Minister of Punjab", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Bhagwant_Mann_2026.jpg/500px-Bhagwant_Mann_2026.jpg"},
    {"name": "Bhajan Lal Sharma", "state": "Rajasthan", "state_key": "RAJASTHAN", "party": "BJP", "designation": "Chief Minister of Rajasthan", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Bhajan_Lal_Sharma_and_deputies_meets_VP_of_India.jpg"},
    {"name": "Prem Singh Tamang", "state": "Sikkim", "state_key": "SIKKIM", "party": "SKM", "designation": "Chief Minister of Sikkim", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/7/72/Prem_Singh_Tamang%2C_Chief_Minister_of_Sikkim.jpg"},
    {"name": "C. Joseph Vijay", "state": "Tamil Nadu", "state_key": "TAMIL NADU", "party": "TVK", "designation": "Chief Minister of Tamil Nadu", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/JosephVijay.jpg/500px-JosephVijay.jpg"},
    {"name": "Revanth Reddy", "state": "Telangana", "state_key": "TELANGANA", "party": "INC", "designation": "Chief Minister of Telangana", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Portrait_of_Telangana_CM_Revanth_Reddy.png/500px-Portrait_of_Telangana_CM_Revanth_Reddy.png"},
    {"name": "Manik Saha", "state": "Tripura", "state_key": "TRIPURA", "party": "BJP", "designation": "Chief Minister of Tripura", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Dr._Manik_Saha.jpg/500px-Dr._Manik_Saha.jpg"},
    {"name": "Yogi Adityanath", "state": "Uttar Pradesh", "state_key": "UTTAR PRADESH", "party": "BJP", "designation": "Chief Minister of Uttar Pradesh", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Yogiji_in_2023.jpg/500px-Yogiji_in_2023.jpg"},
    {"name": "Pushkar Singh Dhami", "state": "Uttarakhand", "state_key": "UTTARAKHAND", "party": "BJP", "designation": "Chief Minister of Uttarakhand", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/9/95/Pushkar_Singh_Dhami%2C_Chief_Minister_of_Uttarakhand.jpg"},
    {"name": "Suvendu Adhikari", "state": "West Bengal", "state_key": "WEST BENGAL", "party": "BJP", "designation": "Chief Minister of West Bengal", "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Suvendu_Adhikari_May_2026_%28cropped%29.jpg/500px-Suvendu_Adhikari_May_2026_%28cropped%29.jpg"},
]


def ensure_schema() -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chief_ministers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                state TEXT NOT NULL,
                state_key TEXT NOT NULL UNIQUE,
                party TEXT,
                designation TEXT,
                photo_url TEXT,
                slap_count INTEGER NOT NULL DEFAULT 0,
                rose_count INTEGER NOT NULL DEFAULT 0
            )
        """))


def upsert_chief_ministers(rows: list[dict]) -> None:
    with engine.begin() as conn:
        for row in rows:
            conn.execute(text("""
                INSERT INTO chief_ministers (name, state, state_key, party, designation, photo_url)
                VALUES (:name, :state, :state_key, :party, :designation, :photo_url)
                ON CONFLICT (state_key) DO UPDATE SET
                    name = EXCLUDED.name,
                    state = EXCLUDED.state,
                    party = EXCLUDED.party,
                    designation = EXCLUDED.designation,
                    photo_url = EXCLUDED.photo_url
            """), row)
    # slap_count/rose_count are deliberately untouched on conflict -- they're
    # live user vote tallies, not source data, and must survive a re-run of
    # this script (e.g. after a CM changes and the roster is updated).


def main() -> None:
    ensure_schema()
    upsert_chief_ministers(ROSTER)
    print(f"Stored {len(ROSTER)} rows in chief_ministers")


if __name__ == "__main__":
    main()
