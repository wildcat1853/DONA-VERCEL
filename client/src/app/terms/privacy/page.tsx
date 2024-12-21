export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy for Dona AI</h1>
      <p className="text-gray-600 mb-8">Effective Date: 20.10.24</p>

      <div className="prose prose-gray max-w-none">
        <p className="mb-6">
          [Your Company Name] ("we," "our," or "us") is committed to protecting your privacy. 
          This Privacy Policy explains how we collect, use, and share your personal information 
          when you use Dona AI (the "App") and related services.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="mb-4">We may collect the following types of information when you use the App:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Personal Information: Your name, email address, and other details you provide when signing up or using our services.</li>
            <li>Usage Data: Details of your interactions with the App, such as features used and time spent.</li>
            <li>Device Information: IP address, device type, operating system, and browser type.</li>
            <li>Third-Party Data: Information received from external services like Google OAuth when you use third-party login.</li>
          </ul>
        </section>

        {/* Rest of the sections... */}
        
        {/* <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at:</p>
          <ul className="list-none pl-6 space-y-2">
            <li>Email: [your_email@example.com]</li>
            <li>Mail: [Your Company Name, Address, City, State, Zip]</li>
          </ul>
        </section> */}
      </div>
    </div>
  );
}