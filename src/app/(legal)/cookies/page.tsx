import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  robots: { index: false },
};

export default function CookiePolicyPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p>
        <strong>Last updated: 16 March 2026</strong>
      </p>

      <p>
        This Cookie Policy explains what cookies and similar technologies
        Distillr uses, why we use them, and how you can control them.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device by your browser. They
        allow a website to remember information about your visit (such as whether
        you are logged in) across page loads and sessions.
      </p>

      <h2>Cookies we use</h2>

      <h3>Strictly Necessary</h3>
      <p>
        These cookies are required for the Service to function. They cannot be
        disabled.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>sb-*</code> (Supabase)
            </td>
            <td>
              Stores your authentication session so you stay logged in between
              page loads.
            </td>
            <td>Session / up to 1 week</td>
          </tr>
          <tr>
            <td>
              <code>sidebar_state</code>
            </td>
            <td>
              Remembers whether the navigation sidebar is open or closed.
            </td>
            <td>7 days</td>
          </tr>
        </tbody>
      </table>

      <h3>Analytics</h3>
      <p>
        We use <strong>PostHog</strong> to understand how the Service is used
        (e.g. which features are popular, where users drop off). This helps us
        prioritise improvements. Analytics cookies are only set if you give your
        consent.
      </p>
      <table>
        <thead>
          <tr>
            <th>Cookie</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>ph_*</code> (PostHog)
            </td>
            <td>
              Tracks anonymous usage events and identifies returning visitors.
              No personally identifiable information is linked to these cookies
              without your consent.
            </td>
            <td>Up to 1 year</td>
          </tr>
        </tbody>
      </table>

      <h2>Third-party services that process data (no cookies)</h2>
      <p>
        <strong>Sentry</strong> monitors application errors. It may process your
        IP address and browser information when an error occurs. Sentry does not
        set cookies in your browser. See the{" "}
        <a href="/privacy">Privacy Policy</a> for details.
      </p>

      <h2>Managing your preferences</h2>
      <p>You can change your cookie preferences at any time:</p>
      <ul>
        <li>
          Use the <strong>Cookie Preferences</strong> link in the page footer to
          open the preferences panel and update your choices.
        </li>
        <li>
          You can also clear cookies via your browser settings. Note that
          clearing authentication cookies will sign you out of Distillr.
        </li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions about this Cookie Policy? Email us at{" "}
        <a href="mailto:hello@distillr.co">hello@distillr.co</a>.
      </p>
    </>
  );
}
