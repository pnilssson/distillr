import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>
        <strong>Last updated: 17 March 2026</strong>
      </p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of Distillr (&quot;Service&quot;), operated by Pär Nilsson (enskild
        firma), Sweden. By creating an account or using the Service you agree to
        these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Distillr is a web application that lets you build a personal knowledge
        base from content sources. The Service processes content with AI to make
        it searchable and queryable via chat.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 16 years old to use the Service. By using the
        Service you confirm that you meet this requirement.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You authenticate with a magic link sent to your email address. You are
        responsible for keeping access to your email account secure. Notify us
        immediately at{" "}
        <a href="mailto:hello@distillr.co">hello@distillr.co</a> if you believe
        your account has been compromised.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Use the Service for any unlawful purpose or in violation of these
          Terms.
        </li>
        <li>
          Add content that infringes third-party intellectual property rights or
          that you are not authorised to submit.
        </li>
        <li>
          Submit confidential, proprietary, or sensitive content that you are
          not authorised to share with third-party processors.
        </li>
        <li>
          Attempt to reverse-engineer, scrape, or overload the Service.
        </li>
        <li>
          Use the Service to generate or distribute harmful, abusive, or
          misleading content.
        </li>
        <li>
          Resell or sublicense access to the Service without our written
          permission.
        </li>
      </ul>

      <h2>5. Subscriptions and Payment</h2>
      <p>
        The Service is offered on a subscription basis. Prices and plan details
        are shown on the pricing page. Payments are processed by our payment
        provider, Polar. Subscriptions renew automatically unless cancelled before
        the renewal date.
      </p>
      <p>
        We reserve the right to change prices with at least 30 days&apos; notice.
        Continued use of the Service after a price change takes effect constitutes
        acceptance of the new price.
      </p>
      <p>
        Refunds are handled on a case-by-case basis. Contact{" "}
        <a href="mailto:hello@distillr.co">hello@distillr.co</a> within 14 days
        of a charge if you believe a refund is warranted.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        You retain ownership of any content you add to the Service. By using the
        Service you grant us a limited licence to process and store that content
        solely to provide the Service to you.
      </p>
      <p>
        Distillr, its logo, and all software, design, and text on the Service are
        owned by or licensed to Pär Nilsson and may not be copied or reused
        without permission.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;
        without warranties of any kind, either express or implied. We do not
        warrant that the Service will be uninterrupted, error-free, or that AI
        responses will be accurate or complete.
      </p>
      <p>
        AI-generated content may contain errors. Do not rely on it as a
        substitute for professional advice.
      </p>
      <p>
        <strong>User-submitted content.</strong> The Service processes content
        you submit through AI models and third-party infrastructure. You are
        solely responsible for ensuring you are authorised to submit any content
        you add. Do not submit content that contains confidential, proprietary,
        personal, or otherwise sensitive information that you are not authorised
        to share with third-party processors. We accept no responsibility for
        any consequences arising from the submission of such information.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by applicable law, Pär Nilsson shall not
        be liable for any indirect, incidental, special, consequential, or
        punitive damages arising out of or related to your use of the Service,
        even if advised of the possibility of such damages.
      </p>
      <p>
        Our total liability to you for any claim arising out of these Terms or
        your use of the Service shall not exceed the amount you paid us in the
        three months preceding the claim.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may cancel your subscription and delete your account at any time. We
        may suspend or terminate your account if you breach these Terms or if we
        discontinue the Service, with reasonable notice where practicable.
      </p>

      <h2>10. Governing Law and Disputes</h2>
      <p>
        These Terms are governed by Swedish law. Any dispute that cannot be
        resolved amicably shall be submitted to the exclusive jurisdiction of
        Swedish courts.
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you by email
        or via the Service at least 14 days before material changes take effect.
        Continued use of the Service after that date constitutes acceptance.
      </p>

      <h2>12. Contact</h2>
      <p>
        <a href="mailto:hello@distillr.co">hello@distillr.co</a>
      </p>
    </>
  );
}
