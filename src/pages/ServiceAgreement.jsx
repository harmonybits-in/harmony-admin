import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'

const COMPANY = {
  name:    'HarmoneyBits Private Limited',
  cin:     '[CIN: UXXXXXXXX2024PTCXXXXXX]',
  address: '[Registered Office Address], India',
  website: 'https://harmonybits.in',
  terms:   'https://harmonybits.in/terms',
  privacy: 'https://harmonybits.in/privacy',
  product: 'Harmony OS',
  brand:   'HarmoneyEats',
}

const SECTIONS = [
  {
    no: '1', title: 'Scope of Services',
    paras: [
      `Subject to the terms of this Agreement, ${COMPANY.name} shall provide ${COMPANY.product} Software and Paid Services to the Outlet ("Services"). ${COMPANY.name} hereby grants to the Outlet a non-exclusive, non-transferable, revocable, non-sublicensable, limited license to use and access the Services solely for the Outlet's internal business operations strictly in accordance with the Documentation and this Agreement. No other rights in the Services are granted to the Outlet.`,
      `The Outlet's entitlement to access and utilize Paid Services during the Term, and any validity or availability period for such Paid Services shall be strictly co-extensive with, and conditional upon, the continued subsistence of this Agreement.`,
      `Title to the ${COMPANY.product} Software shall remain vested with ${COMPANY.name}, and nothing in this Agreement will give or convey any right, title or interest therein to the Outlet.`,
      `The Outlet acknowledges that this Agreement is a license cum services agreement and shall not transfer or sublicense the license to any third party without prior written consent of ${COMPANY.name}.`,
      `"Documentation" means user guides, specifications and policies made available by ${COMPANY.name} including Online Terms and Conditions (${COMPANY.terms}), Privacy Policy (${COMPANY.privacy}), user manuals, guidelines, instruction and training materials.`,
      `"Outlet Data" includes (a) Transactional Data — sales, invoice and transactional data generated via the ${COMPANY.product} Software; and (b) Outlet Profile Details — basic outlet profile including personal information of identified or identifiable individuals. ${COMPANY.name} shall access, collect, store and process Outlet Profile Details for user account management and providing Services.`,
      `"Aggregated/De-Identified Data" means data derived from Outlet Data that is anonymised, does not identify the Outlet or any individual, and may be used in aggregate form.`,
      `The ${COMPANY.product} Software provides point-of-sale and billing functionality only. It is not an accounting, bookkeeping, ERP, audit, or statutory compliance system. The Outlet remains solely responsible for accounting records, tax computations and filings, financial reporting, and all legal or regulatory compliance.`,
      `The Outlet may be provided with access to certain third-party services. Such third-party services are subject to separate terms and conditions of the respective providers. ${COMPANY.name} shall not be liable for the performance, availability, accuracy, or any other aspect of such third-party services.`,
    ],
  },
  {
    no: '2', title: 'Consideration',
    paras: [
      `In lieu of the Services, the Outlet shall pay to ${COMPANY.name} such consideration as prescribed from time to time ("Consideration"). All Consideration paid are non-cancellable and non-refundable.`,
      `If any Consideration remains unpaid beyond 15 (fifteen) days from the due date, ${COMPANY.name} may suspend access to the Software and/or Paid Services until all overdue amounts are paid in full. Suspension is without prejudice to the right to terminate under Clause 10.`,
    ],
  },
  {
    no: '3', title: 'Taxes',
    paras: [
      `The Consideration agreed and payable to ${COMPANY.name} is exclusive of all taxes. All indirect taxes applicable from time to time shall be borne by the Outlet. The Outlet shall withhold taxes only if required by law and shall provide valid withholding tax certificates.`,
    ],
  },
  {
    no: '4', title: 'Term',
    paras: [
      `This Agreement shall be valid for 1 (one) year from the date of signing up ("Term") and shall automatically be renewed on payment of renewal fees unless either Party gives a 30 (thirty) day prior written notice of non-renewal.`,
      `For Outlets whose subscription expires and is not renewed within 30 days, the system will mark the Outlet as "dormant". After 60 days from the start of the dormant period, all Outlet Data shall be automatically deleted.`,
      `Active Outlet logs will be stored and retained for 180 (one hundred and eighty) days on a rolling basis. Extended retention requires enablement of the applicable plan.`,
      `Upon request, ${COMPANY.name} shall permanently delete all Transactional Data pertaining to such Outlet, except where retention is required by law. Upon expiry or termination, the Outlet shall download its data within 90 days, after which it shall be automatically deleted.`,
      `Following expiry or termination, ${COMPANY.name} may retain Outlet Profile Details as permitted under its Privacy Policy and applicable laws, and may retain and utilize Outlet Data in the form of Aggregated/De-Identified Data.`,
    ],
  },
  {
    no: '5', title: 'Terms of Services',
    paras: [
      `${COMPANY.name} may update, enhance, modify or discontinue features, functionality or integrations from time to time without notice, provided that such changes do not materially diminish the core functionality of the Software.`,
      `The Outlet shall be responsible to input the information required by the Software in an effective manner. ${COMPANY.name} shall not be liable for any error of omission or commission by the Outlet. The Outlet shall be solely responsible for configuring user permissions, roles, and access controls.`,
      `The Outlet shall not (i) use the Software other than as mentioned in this Agreement; (ii) translate, adapt, modify or create derivative works; (iii) market, distribute, assign, transfer, rent, lease or loan the Services; (iv) reverse engineer, decompile, disassemble or attempt to derive source code; (v) disclose or transfer Services to any third party without prior written consent; (vi) access the Services to build a competitive product; (vii) introduce any malware or circumvent security controls; or (viii) use the Services in violation of applicable law.`,
      `${COMPANY.name} shall provide installation services along with initial training with respect to the working and functionality of the Software and/or Paid Services.`,
      `${COMPANY.name} shall provide support and maintenance services including resolving Software malfunction and related concerns.`,
      `${COMPANY.name} shall provide online end-to-end customer and technical support. On-site visits may be chargeable at then-current rates together with reasonable travel and out-of-pocket expenses.`,
      `This Agreement is subject to ${COMPANY.name}'s Policies as amended from time to time. Continued use of the Services after receiving any notice of policy changes shall be deemed acceptance.`,
    ],
  },
  {
    no: '6', title: 'Obligations of Outlet',
    paras: [
      `Outlet shall maintain adequate administrative, technical and physical safeguards to secure customer information. Outlet shall be solely liable for any breach of security or compromise of customer data.`,
      `The Outlet authorizes ${COMPANY.name} to access and use Outlet Data to enhance business processes including product performance and quality. ${COMPANY.name} may use said data in Aggregated/De-Identified Data compilations.`,
      `The Outlet shall not process any transactions which are prohibited by law or by this Agreement. If any such transaction is processed, ${COMPANY.name} shall be entitled to suspend the Services.`,
    ],
  },
  {
    no: '7', title: 'Representations and Warranties',
    paras: [
      `${COMPANY.name} represents and warrants that it is legally authorized to execute and deliver this Agreement and perform its obligations hereunder, and that its obligations constitute legal, valid and binding obligations enforceable in accordance with this Agreement.`,
      `The Outlet represents and warrants that: (i) it is legally authorized to execute this Agreement; (ii) entering into this Agreement does not breach any contractual or statutory obligation; (iii) it has the relevant consents and approvals to share third-party data; (iv) it does not carry any activity which is illegal or immoral under applicable laws; (v) it shall be solely responsible for compliance with all legal and regulatory requirements applicable to its business; (vi) it has the necessary computer hardware and internet connectivity; (vii) it shall use the Services in conformity with applicable laws and obtain all necessary approvals; (viii) it is responsible for ensuring that Outlet information including address, contact details, menu details and prices is up-to-date and true; (ix) it has complied with all applicable laws including KYC/AML procedures.`,
      `SERVICES PROVIDED UNDER THIS AGREEMENT ARE PROVIDED "AS IS" AND ON AN "AS-AVAILABLE" BASIS WITHOUT ANY EXPRESS OR IMPLIED WARRANTY. ${COMPANY.name.toUpperCase()} DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, NON-INFRINGEMENT, OR FITNESS FOR A PARTICULAR PURPOSE.`,
    ],
  },
  {
    no: '8', title: 'Limitation of Liability',
    paras: [
      `${COMPANY.name} shall not be liable for any loss of revenue, profit or data or from direct or indirect, special, incidental, consequential, or punitive damages arising out of or in connection with this Agreement.`,
      `${COMPANY.name} shall have no liability for any damages resulting from alteration, destruction or loss of any data or information input, generated or obtained from access and/or use of the Software.`,
      `To the maximum extent permitted by law, ${COMPANY.name}'s aggregate liability shall not exceed INR 1,000/- (Indian Rupees One Thousand only) in any circumstances.`,
    ],
  },
  {
    no: '9', title: 'Indemnification',
    paras: [
      `The Outlet hereby agrees to indemnify, hold harmless and defend ${COMPANY.name}, its affiliates and their respective officers, directors, employees and agents from and against any and all liabilities, damages, losses, costs and expenses arising from or related to: (a) Outlet's use of the Software or Services; (b) any allegation that use of the Services infringes any third party's rights; (c) Outlet's wrongful or improper use of the Software; (d) all transactions recorded and stored by Outlet using the Services; (e) breach of any applicable laws by the Outlet; (f) any other party's access and/or use of the Services with Outlet's credentials; and (g) Outlet's failure to maintain proper books of account.`,
    ],
  },
  {
    no: '10', title: 'Termination',
    paras: [
      `Either Party may terminate this Agreement with 30 (thirty) days prior written notice.`,
      `${COMPANY.name} shall be entitled to terminate this Agreement with immediate effect without notice if: (i) the Outlet fails to make requisite payments within the agreed timeline; (ii) the Outlet breaches any terms, representations, warranties or applicable laws; or (iii) required by law/regulatory directive, or in the event of the Outlet's insolvency or cessation of business.`,
      `Upon expiry or termination, the Outlet shall no longer be able to use the Services. ${COMPANY.name} shall not issue any refunds in consequence of such expiry or termination.`,
    ],
  },
  {
    no: '11', title: 'Intellectual Property Rights',
    paras: [
      `${COMPANY.name} owns all right, title and interest in and to the ${COMPANY.product} Software, Paid Services and other Services including all patents, trademarks, copyrights, designs, trade secrets, know-how and any other form of intellectual property rights.`,
      `No rights or licenses are granted by ${COMPANY.name} to the Outlet, expressly or by implication, with respect to any Intellectual Property Rights owned or controlled by ${COMPANY.name}.`,
      `Upon expiry and/or termination of this Agreement, the Outlet shall immediately discontinue all use of Intellectual Property Rights of ${COMPANY.name}.`,
    ],
  },
  {
    no: '12', title: 'Confidentiality',
    paras: [
      `Each Party shall at all times keep the other Party's Confidential Information strictly confidential, shall not disclose it to any third party without the other Party's prior written consent, and shall use it solely for the purposes of performing its obligations under this Agreement.`,
      `The Parties acknowledge that performance of this Agreement requires ${COMPANY.name} to process, transmit and/or store Personal Information provided by or through the Outlet. Each Party shall comply with applicable data protection laws including the Digital Personal Data Protection Act, 2023.`,
      `The obligations in this Clause shall survive termination or expiry of the Agreement for 1 year.`,
    ],
  },
  {
    no: '13', title: 'Force Majeure',
    paras: [
      `Neither Party shall be liable for any failure to perform their respective obligations if such failure is due to any Force Majeure event, provided a notice is given within 15 (fifteen) days of such occurrence. "Force Majeure" includes civil disturbance, war, terrorist acts, sabotage, pandemic, or epidemic.`,
    ],
  },
  {
    no: '14', title: 'Governing Law & Dispute Resolution',
    paras: [
      `This Agreement shall be governed and interpreted in accordance with the laws of India. Any dispute, controversy or claim arising out of or relating to this Agreement shall, unless settled amicably by good faith negotiation, be subject to the exclusive jurisdiction of the competent courts in India.`,
    ],
  },
]

export default function ServiceAgreement({ onAccept, standalone = false }) {
  const [scrolled,  setScrolled]  = useState(false)
  const [accepted,  setAccepted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const toast    = useToast()

  function handleScroll(e) {
    const el = e.target
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    if (atBottom) setScrolled(true)
  }

  async function handleAccept() {
    if (!accepted) { toast.error('Pehle "I Agree" checkbox tick karo'); return }
    setSubmitting(true)
    try {
      if (onAccept) await onAccept()
      toast.success('Service Agreement accepted!')
      if (standalone) navigate('/')
    } catch { toast.error('Submit failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: standalone ? '2rem' : 0 }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Service Agreement</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            {COMPANY.name} — {COMPANY.product} Platform
          </p>
        </div>

        {/* Parties */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.25rem', marginBottom: '1rem',
          fontSize: 13, lineHeight: 1.7 }}>
          <p>
            This Service Agreement ("Agreement") is entered into by and between{' '}
            <strong>{COMPANY.name}</strong> ({COMPANY.cin}), having its registered office at{' '}
            {COMPANY.address}, hereinafter referred to as <strong>"Service Provider"</strong>;
          </p>
          <p style={{ margin: '8px 0' }}>AND</p>
          <p>
            The undersigned entity (sole proprietorship, LLP, partnership, private limited company,
            or any other body corporate) who avails Services of the Service Provider, hereinafter
            referred to as the <strong>"Outlet"</strong>.
          </p>
          <p style={{ marginTop: 8, marginBottom: 0, color: 'var(--text-muted)', fontSize: 12 }}>
            The Service Provider and the Outlet shall individually be referred to as "Party" and
            collectively as "Parties".
          </p>
        </div>

        {/* Scrollable Agreement Body */}
        <div onScroll={handleScroll} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.5rem',
          height: 440, overflowY: 'auto', marginBottom: '1rem',
          fontSize: 13, lineHeight: 1.7,
        }}>
          {SECTIONS.map(sec => (
            <div key={sec.no} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px',
                color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                {sec.no}. {sec.title}
              </h3>
              {sec.paras.map((p, i) => (
                <p key={i} style={{ margin: '0 0 10px', color: 'var(--text-muted)' }}>
                  {sec.paras.length > 1 && (
                    <strong style={{ color: 'var(--text)' }}>{sec.no}.{i + 1} </strong>
                  )}
                  {p}
                </p>
              ))}
            </div>
          ))}

          {/* Footer note */}
          <div style={{ padding: '14px 16px', borderRadius: 8,
            background: 'var(--bg-page)', border: '1px solid var(--border)',
            fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginTop: 8 }}>
            I, on behalf of the Outlet, have read the terms and conditions stated above and hereby
            agree to the same by clicking the 'I Accept' button below. I am aware that this document
            is an electronic record in terms of the Information Technology Act, 2000 and the rules
            framed thereunder, and forms a valid contract under the Indian Contract Act, 1872. This
            electronic record is generated by a computer system and does not require any physical or
            digital signature.
          </div>
        </div>

        {!scrolled && (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
            marginBottom: 8, fontStyle: 'italic' }}>
            ↓ Pura agreement padhne ke liye scroll karo
          </div>
        )}

        {/* Accept */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
            cursor: 'pointer', marginBottom: '1rem' }}>
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--accent)',
                flexShrink: 0, cursor: 'pointer' }} />
            <span style={{ fontSize: 13, lineHeight: 1.6 }}>
              Maine upar diya hua Service Agreement poora padh liya hai. Main{' '}
              <strong>{COMPANY.name}</strong> ke saath is Agreement ke terms and conditions se
              agree karta/karti hun.
            </span>
          </label>

          <button onClick={handleAccept} disabled={!accepted || submitting} style={{
            width: '100%', padding: '11px', borderRadius: 8, border: 'none',
            background: accepted ? 'var(--accent)' : 'var(--border)',
            color: '#fff', cursor: accepted ? 'pointer' : 'not-allowed',
            fontSize: 14, fontWeight: 700,
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? 'Submitting…' : '✅ I Accept — Agree Karta/Karti Hun'}
          </button>
        </div>
      </div>
    </div>
  )
}
