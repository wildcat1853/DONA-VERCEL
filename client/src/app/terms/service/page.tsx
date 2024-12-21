import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms of Service for Dona AI</h1>
      <p className="text-gray-600 mb-8">Effective Date: [Insert Date]</p>

      <div className="prose prose-gray max-w-none">
        <p className="mb-6">
          Welcome to Dona AI! By accessing or using Dona AI (the &ldquo;App&rdquo;), you agree to the following 
          terms and conditions (the &ldquo;Terms&rdquo;). If you do not agree, do not use our services.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Use of the App</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Eligibility: You must be at least 18 years old to use the App.</li>
            <li>Account Security: You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>Prohibited Activities: You may not use the App for illegal purposes, violate intellectual property rights, or harm others.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Intellectual Property</h2>
          <p>
            All content and materials within the App, including logos, text, and graphics, are owned 
            by [Your Company Name] or its licensors. You may not reproduce, distribute, or modify 
            this content without prior written consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Content</h2>
          <p>
            You retain ownership of any content you submit through the App. By submitting content, 
            you grant us a non-exclusive, worldwide license to use, display, and distribute your 
            content to operate and improve our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
          <p>
            The App may integrate with third-party services (e.g., Google OAuth). We are not 
            responsible for the practices of these services and recommend reviewing their terms 
            and policies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, [Your Company Name] is not liable for any 
            direct, indirect, incidental, or consequential damages arising from your use of the App.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Termination</h2>
          <p>
            We reserve the right to terminate or suspend your access to the App at our discretion, 
            without notice, for violating these Terms or for any reason deemed necessary.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Changes to These Terms</h2>
          <p>
            We may modify these Terms at any time. Continued use of the App after changes indicates 
            your acceptance of the updated Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Governing Law</h2>
          <p>
            These Terms are governed by the laws of [Your State/Country], without regard to its 
            conflict of laws provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <ul className="list-none pl-6 space-y-2">
            <li>Email: [your_email@example.com]</li>
            <li>Mail: [Your Company Name, Address, City, State, Zip]</li>
          </ul>
        </section>
      </div>
    </div>
  );
}