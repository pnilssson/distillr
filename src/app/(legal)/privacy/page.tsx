import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="lead">
        <strong>Last updated: 17 March 2026</strong>
      </p>

      <p>
        This Privacy Policy explains how Distillr (&quot;we&quot;,
        &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your
        personal data when you use distillr.co (the &quot;Service&quot;).
      </p>

      <h2>1. Data Controller</h2>
      <p>
        The data controller is:
        <br />
        <strong>Pär Nilsson</strong> (enskild firma)
        <br />
        Email:{" "}
        <a href="mailto:hello@distillr.co">hello@distillr.co</a>
      </p>
      <p>
        If you have questions about how we handle your personal data, please
        contact us at that address.
      </p>

      <h2>2. What Data We Collect</h2>

      <h3>Account data</h3>
      <p>
        When you create an account we collect your <strong>email address</strong>.
        We use magic-link authentication — no password is stored.
      </p>

      <h3>Usage data</h3>
      <p>
        With your consent we collect anonymised analytics events (pages visited,
        features used, session duration) via PostHog. This helps us understand
        how the Service is used and improve it. If you decline analytics cookies
        no tracking events are recorded.
      </p>

      <h3>Content you provide</h3>
      <p>
        Content sources you add to the Service, any content extracted from those
        sources, and the text of chat messages you send are stored so that we
        can provide the Service to you. This content is processed by AI models
        operated by third-party providers (see Section 4).
      </p>
      <p>
        <strong>
          Do not submit content containing confidential, proprietary, or
          sensitive information
        </strong>{" "}
        that you are not authorised to share with third-party processors. We are
        not responsible for any consequences resulting from such submissions.
      </p>

      <h3>Billing data</h3>
      <p>
        Payment information (card number, billing address) is handled entirely by
        our payment processor, Polar. We receive only a customer ID and
        subscription status. We never store full card details.
      </p>

      <h3>Error and performance data</h3>
      <p>
        We use Sentry to monitor application errors. Sentry may collect device
        information, browser type, and — where relevant to diagnosing an error —
        parts of the request that triggered it. This data is retained for 90 days
        in Sentry.
      </p>

      <h2>3. Legal Basis for Processing</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Legal basis (GDPR Art. 6)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Providing the Service (auth, content storage, chat)</td>
            <td>
              Performance of a contract — Art. 6(1)(b)
            </td>
          </tr>
          <tr>
            <td>Analytics (PostHog)</td>
            <td>Consent — Art. 6(1)(a)</td>
          </tr>
          <tr>
            <td>Error monitoring (Sentry)</td>
            <td>Legitimate interest — Art. 6(1)(f)</td>
          </tr>
          <tr>
            <td>Billing and invoicing</td>
            <td>
              Performance of a contract / legal obligation — Art. 6(1)(b)(c)
            </td>
          </tr>
        </tbody>
      </table>

      <h2>4. Data Processors (Sub-processors)</h2>
      <p>
        We share data with the following third-party processors to operate the
        Service:
      </p>
      <table>
        <thead>
          <tr>
            <th>Processor</th>
            <th>Purpose</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>Database, authentication</td>
            <td>EU (AWS eu-west-1)</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Hosting and edge functions</td>
            <td>US / EU</td>
          </tr>
          <tr>
            <td>OpenAI</td>
            <td>AI content analysis and embeddings</td>
            <td>US</td>
          </tr>
          <tr>
            <td>PostHog</td>
            <td>Product analytics (with consent)</td>
            <td>EU (PostHog Cloud EU)</td>
          </tr>
          <tr>
            <td>Sentry</td>
            <td>Error and performance monitoring</td>
            <td>US</td>
          </tr>
          <tr>
            <td>Polar</td>
            <td>Payments and subscriptions</td>
            <td>US</td>
          </tr>
          <tr>
            <td>Inngest</td>
            <td>Background job orchestration</td>
            <td>US</td>
          </tr>
        </tbody>
      </table>

      <h2>5. International Data Transfers</h2>
      <p>
        Some of our processors (OpenAI, Sentry, Polar, Inngest, Vercel) are
        based in the United States. Where personal data is transferred outside
        the EU/EEA we rely on Standard Contractual Clauses (SCCs) approved by
        the European Commission, or an adequacy decision, to ensure an adequate
        level of protection.
      </p>

      <h2>6. Data Retention</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Retention period</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account data (email)</td>
            <td>Until account deletion</td>
          </tr>
          <tr>
            <td>Libraries, transcripts, chat history</td>
            <td>Until account deletion</td>
          </tr>
          <tr>
            <td>Analytics events (PostHog)</td>
            <td>12 months</td>
          </tr>
          <tr>
            <td>Error reports (Sentry)</td>
            <td>90 days</td>
          </tr>
          <tr>
            <td>Billing records</td>
            <td>7 years (Swedish accounting law)</td>
          </tr>
        </tbody>
      </table>

      <h2>7. Your Rights</h2>
      <p>
        Under the GDPR you have the right to:
      </p>
      <ul>
        <li>
          <strong>Access</strong> — request a copy of the personal data we hold
          about you.
        </li>
        <li>
          <strong>Rectification</strong> — ask us to correct inaccurate data.
        </li>
        <li>
          <strong>Erasure</strong> — ask us to delete your personal data (subject
          to legal retention obligations).
        </li>
        <li>
          <strong>Restriction</strong> — ask us to restrict processing in certain
          circumstances.
        </li>
        <li>
          <strong>Data portability</strong> — receive your data in a
          machine-readable format.
        </li>
        <li>
          <strong>Object</strong> — object to processing based on legitimate
          interests.
        </li>
        <li>
          <strong>Withdraw consent</strong> — withdraw analytics consent at any
          time via the Cookie Preferences link in the footer. This does not affect
          the lawfulness of processing before withdrawal.
        </li>
      </ul>
      <p>
        To exercise any right, email us at{" "}
        <a href="mailto:hello@distillr.co">hello@distillr.co</a>. We will respond
        within 30 days.
      </p>

      <h2>8. Supervisory Authority</h2>
      <p>
        You have the right to lodge a complaint with the Swedish Authority for
        Privacy Protection (Integritetsskyddsmyndigheten, IMY) at{" "}
        <a
          href="https://www.imy.se"
          target="_blank"
          rel="noopener noreferrer"
        >
          imy.se
        </a>
        .
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. We will notify you of
        material changes by email or by a prominent notice in the Service. The
        &quot;Last updated&quot; date at the top of this page reflects the most
        recent revision.
      </p>

      <h2>10. Contact</h2>
      <p>
        <a href="mailto:hello@distillr.co">hello@distillr.co</a>
      </p>
    </>
  );
}
