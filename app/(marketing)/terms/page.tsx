import type { Metadata } from 'next';
import { LegalPage, type LegalSection } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Use | HEVACRAZ',
  description: 'Terms for use of the HEVACRAZ HVAC-R membership, learning, compliance, and field platform.',
};

const sections: LegalSection[] = [
  {
    title: 'About these terms',
    paragraphs: [
      'These terms govern access to and use of the HEVACRAZ HVAC-R platform and its public website features. By accessing or using the platform, you agree to follow these terms and applicable law. If you use the platform on behalf of an organisation, you confirm that you are authorised to act for it. If you do not agree, do not use the platform.',
      'These terms are a platform-use notice and do not replace a separate membership, training, employment, supplier, certification, or service agreement. Where an approved agreement conflicts with these terms, the approved agreement governs that specific service to the extent stated in it.',
    ],
  },
  {
    title: 'Accounts, invitations, and access',
    bullets: [
      'Provide accurate information, keep it reasonably current, and use only accounts and roles assigned to you through the platform’s authorised process.',
      'Keep passwords, invitation links, and authentication codes private. Tell HEVACRAZ promptly if you suspect unauthorised access or an account was created using your details.',
      'Do not share an account or use another person’s credentials. Access may be limited to the records and actions needed for your role.',
      'HEVACRAZ may correct role or access errors, suspend an account to protect users or records, or revoke access when authorisation ends, subject to applicable law and any required process.',
    ],
  },
  {
    title: 'Acceptable use',
    paragraphs: ['You must not:'],
    bullets: [
      'Submit information, documents, certificates, transaction details, or reports that you know are false, misleading, unauthorised, or infringe another person’s rights.',
      'Access records or functions without permission, bypass security, probe or disrupt the service, introduce malicious code, or interfere with another user’s access.',
      'Use the platform to unlawfully discriminate, harass, threaten, expose private information, or send unsolicited or unlawful communications.',
      'Use platform data for an unrelated purpose or export, copy, or republish another person’s information unless authorised and legally permitted.',
    ],
  },
  {
    title: 'User-submitted information and records',
    paragraphs: [
      'You retain any rights you hold in information and files you submit. You give HEVACRAZ and its authorised service providers permission to host, process, display to authorised users, and use that material only as needed to operate the requested platform features, support association workflows, meet legal duties, and enforce these terms.',
      'You are responsible for having the rights and authority needed to submit the material, including photographs and personal information about other people. Do not upload passwords or information unrelated to the platform purpose.',
      'Records may be used in training, credential, safety, compliance, audit, reporting, or verification workflows. Limited fields may be displayed to other authorised users or, where a public registry or verification feature is enabled, to the public. Do not submit information for publication unless you have read the relevant notice and have authority to do so.',
    ],
  },
  {
    title: 'Training, certification, and verification',
    paragraphs: [
      'Course materials, assessments, attendance records, applications, and certificate requests are subject to review rules set by the responsible training or certification authority. A platform status, application, or course completion does not itself guarantee admission, approval, professional registration, or issuance of a certificate.',
      'Verification results reflect the records available to the platform at the time of lookup. A result is not a substitute for checking the original credential with its issuer where a decision depends on it.',
    ],
  },
  {
    title: 'Calculators, technical guidance, and safety',
    paragraphs: [
      'Sizing tools, refrigerant lookups, risk prompts, checklists, and other technical outputs are general decision-support aids. They depend on user-entered data and stated assumptions and may be incomplete or approximate. They are not a site survey, engineering design, equipment selection, safety data sheet, professional certification, or regulatory approval.',
      'You remain responsible for verifying conditions, current standards, manufacturer instructions, refrigerant identity, and applicable legal requirements with a suitably qualified professional. Do not rely on a platform result where an error could create an immediate risk to health, safety, property, or the environment.',
    ],
  },
  {
    title: 'Service availability and third-party services',
    paragraphs: [
      'The platform may change, become unavailable, or contain errors while it is maintained or updated. Offline features may hold information on your device until a connection is available; you are responsible for checking that important records have synchronised successfully.',
      'The platform may link to third-party websites or rely on external infrastructure and delivery services. Those services have their own terms and privacy practices, and HEVACRAZ does not control their content or availability.',
    ],
  },
  {
    title: 'Intellectual property',
    paragraphs: [
      'Platform branding, design, software, and HEVACRAZ-provided materials are owned by or licensed to their respective rights holders. You may use them only for their intended platform purpose and may not remove rights notices or redistribute protected material except where the owner has permitted it or the law allows it.',
      'These terms do not transfer ownership of your submitted information or grant you rights to another user’s content.',
    ],
  },
  {
    title: 'Privacy',
    paragraphs: [
      'The Privacy Notice explains how personal information is handled. By using the platform, you acknowledge that information may be processed for the purposes described there, subject to applicable law and any choices or rights available to you.',
    ],
  },
  {
    title: 'Suspension, termination, and records',
    paragraphs: [
      'You may stop using the platform at any time. HEVACRAZ may restrict access where reasonably necessary to protect the service, users, records, or legal obligations, and will use an appropriate notice or review process where required. Closing an account does not automatically erase records that must be retained for legal, professional, certification, safety, audit, or dispute purposes. Privacy requests remain subject to the Privacy Notice and applicable law.',
    ],
  },
  {
    title: 'Disclaimers and liability',
    paragraphs: [
      'To the extent permitted by law, the platform is provided without a promise that it will be uninterrupted, error-free, or suitable for every purpose. Nothing in these terms excludes a right, remedy, warranty, or liability that cannot lawfully be excluded or limited. Any limitation will apply only to the extent permitted by applicable law.',
    ],
  },
  {
    title: 'Changes, governing law, and contact',
    paragraphs: [
      'HEVACRAZ may revise these terms as the platform or applicable requirements change. Updated terms will be posted here with a revised date; material changes should be notified through an appropriate channel. Continued use after updated terms take effect may constitute acceptance where applicable law permits.',
      'These terms are intended to be governed by the laws of Zimbabwe, subject to any mandatory rules that apply. Questions about these terms can be sent to info@hevacraz.co.zw or compliance@hevacraz.co.zw.',
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="These terms explain the rules for using the HEVACRAZ platform, including its membership, training, certification, supplier, compliance, and field-operation features."
      sections={sections}
    />
  );
}
