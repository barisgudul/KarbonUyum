# KarbonUyum Terms of Service & Legal Disclaimer

**Last Updated**: 2025-10-20  
**Version**: 1.0 (MVP)

## Important Notice

**THESE TERMS ARE LEGALLY BINDING. PLEASE READ CAREFULLY BEFORE USING KARBONUYUM.**

---

## 1. Service Overview

KarbonUyum ("Platform") is a carbon emissions tracking and calculation tool for Turkish SMEs (KOBİ). The Platform provides:

- Carbon footprint calculations based on activity data
- Emission factor analysis using Climatiq API
- Benchmarking comparisons with industry peers
- Sustainability recommendations

## 2. Limitation of Liability

### 2.1 No Legal Liability for Calculations

**CRITICAL**: The emissions calculations provided by KarbonUyum are **estimates for guidance purposes only** and do not constitute legal or regulatory compliance reporting.

- KarbonUyum is **NOT liable** for any inaccuracies in calculated emissions
- Results may vary from official measurements or third-party audits
- Users are **solely responsible** for final verification and accuracy

### 2.2 Regulatory Compliance

KarbonUyum calculations are NOT automatically compliant with:

- EU Carbon Border Adjustment Mechanism (CBAM)
- Turkish Ministry of Environment regulations
- CBAM reporting requirements
- ISO 14064-1 standards
- Sustainability Disclosure Regulation (CSRD)

**User Responsibility**: Users must independently verify all calculations meet their regulatory requirements before submitting to authorities.

### 2.3 Fallback Calculations

When Climatiq API is unavailable, KarbonUyum switches to simplified calculations marked with ⚠️ (is_fallback_calculation flag). These fallback results:

- Use generic DEFRA 2023 factors
- Are less accurate than Climatiq API results
- Are clearly marked in the system
- Should be recalculated when service is available

## 3. Data Accuracy & API Dependency

### 3.1 Climatiq API

KarbonUyum relies on **Climatiq** (third-party API) for emission factors. Climatiq's accuracy:

- Is based on publicly available data
- May contain errors or inconsistencies
- Is updated periodically but not real-time
- May not reflect latest scientific research

### 3.2 User Data Quality

Accuracy depends entirely on input data quality. KarbonUyum:

- Validates input format (CSV parsing)
- Does NOT verify factual accuracy of submitted data
- Assumes user-submitted quantities are correct
- Cannot detect data entry errors

**Example**: If user enters "1000 kWh" but actual consumption was "100 kWh", the calculation is still "correct" but the result is wrong.

## 4. Data Privacy & Security

### 4.1 Data Collection

KarbonUyum collects and stores:

- Company information (name, tax number, industry type)
- Facility data (location, size, type)
- Activity data (energy consumption, fuel usage, dates)
- User accounts (email, hashed passwords)

### 4.2 Data Protection

We implement industry-standard security:

- SSL/TLS encryption for data in transit
- PostgreSQL encryption for data at rest
- JWT token-based authentication
- Role-based access control (RBAC)
- Rate limiting and abuse prevention

However, **NO SYSTEM IS 100% SECURE**. KarbonUyum accepts no liability for data breaches.

### 4.3 Data Sharing

KarbonUyum will NOT:

- Sell user data to third parties
- Share individual company data publicly
- Disclose user identities in benchmarking reports

KarbonUyum MAY:

- Use anonymized, aggregated data for benchmarking (minimum 3 companies per comparison)
- Share data with Climatiq API (minimal: activity type, quantity, unit, region)
- Comply with legal obligations (law enforcement, court orders)

### 4.4 KVKK (Turkish Data Protection Law) Compliance

For Turkish users, KarbonUyum complies with KVKK requirements:

- Data processing is lawful (contractual necessity)
- Data retention: Stored until account deletion or legal requirement
- User rights: Access, correction, deletion upon request
- Processor agreements in place with cloud providers

## 5. Warranty Disclaimer

**TO THE MAXIMUM EXTENT PERMITTED BY LAW**, KARBONUYUM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND:

- NO EXPRESS OR IMPLIED WARRANTIES
- NO WARRANTY OF MERCHANTABILITY
- NO WARRANTY OF FITNESS FOR A PARTICULAR PURPOSE
- NO WARRANTY OF ACCURACY OR COMPLETENESS

## 6. Limitation of Damages

**IN NO EVENT SHALL KARBONUYUM BE LIABLE FOR:**

- Any indirect, incidental, special, consequential damages
- Lost profits, lost revenue, lost data
- Damage to reputation or business relationships
- Regulatory fines or penalties
- Third-party claims

**EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.**

**MAXIMUM LIABILITY** (if any): Amount paid by user in past 12 months (or €0 if free user).

## 7. Indemnification

User agrees to indemnify and hold harmless KarbonUyum from any claims arising from:

- User's use of the Platform
- Violations of these Terms
- Infringement of third-party rights
- Regulatory non-compliance based on KarbonUyum calculations

## 8. Acceptable Use Policy

Users MUST NOT use KarbonUyum to:

- Submit false or fraudulent data
- Gain unauthorized access to other users' data
- Interfere with Platform functionality
- Scrape or bulk download data
- Bypass security measures

Violation will result in account suspension.

## 9. Intellectual Property

- KarbonUyum software is owned by KarbonUyum Inc.
- Users retain rights to their data
- Users grant KarbonUyum license to use data for calculations and benchmarking
- Third-party data (Climatiq factors) is subject to Climatiq's terms

## 10. Termination

KarbonUyum may terminate accounts that:

- Violate these Terms
- Contain false or fraudulent data
- Engage in abuse or harassment
- Pose security risks

Upon termination:

- Data is retained per KVKK requirements
- User cannot access Platform
- Benchmarking data remains anonymized

## 11. Modifications to Terms

KarbonUyum reserves the right to modify these Terms at any time. Continued use indicates acceptance.

- Major changes will be announced in-app
- Users will have 30 days to object
- Non-acceptance requires account deletion

## 12. Governing Law & Dispute Resolution

- **Jurisdiction**: Turkish courts (for Turkish users)
- **Applicable Law**: Turkish law (for Turkish users)
- **Dispute Resolution**: Good faith negotiation, then arbitration

## 13. Contact Information

For legal inquiries or to exercise data rights:

- **Email**: legal@karbonuyum.io
- **Address**: [To be filled with actual address]
- **Response Time**: 30 days per KVKK

---

## Acknowledgment

**By clicking "I Accept" or using KarbonUyum, you acknowledge that:**

1. ✅ You have read and understood these Terms
2. ✅ You accept all limitations and disclaimers
3. ✅ You understand calculations are estimates only
4. ✅ You are responsible for regulatory compliance
5. ✅ You understand KarbonUyum is NOT liable for inaccuracies
6. ✅ You accept the data privacy practices

**Failure to accept prevents further Platform use.**

---

## Appendix: FAQ

### Q: Can I submit KarbonUyum reports to Turkish authorities?

**A**: Not without independent verification. Authorities may reject estimates. Always get professional carbon audit for official reporting.

### Q: What if my calculations are wrong?

**A**: You are responsible for data accuracy. Re-verify input data and recalculate.

### Q: Is my data sold?

**A**: No. Anonymized benchmarking data (3+ companies) is used internally. Identifiable data is never sold.

### Q: How do I delete my account?

**A**: Contact legal@karbonuyum.io. Data is deleted per KVKK retention requirements.

### Q: What if KarbonUyum shuts down?

**A**: We will notify users 60 days in advance. You can export all data. Data is deleted per legal requirements.

---

**By using KarbonUyum, you accept these Terms. If you do not agree, do not use the Platform.**

**Date Accepted**: [Recorded automatically]  
**User Email**: [Recorded automatically]  
**IP Address**: [Recorded for audit trail]
