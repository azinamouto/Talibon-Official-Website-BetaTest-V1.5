export interface AssistantAnswer { text: string; route: string; actionText: string }
export interface AssistantTopic extends AssistantAnswer { id: string; title: string; phrases: string[] }

/** Curated navigation guidance, not live records. Never encode fees, phone numbers or officeholders here. */
export const assistantTopics: AssistantTopic[] = [
  { id: 'business', title: 'Business permit', phrases: ['business permit', 'business permits', 'business registration', 'renew business', 'bplo', 'negosyo'],
    text: 'Open E-Services and choose Business Permit. Sign in, complete applicant and business details, review your application, then submit. Check the service listing for current requirements; fees and approval are confirmed by the responsible office.', route: '/e-services?type=Business%20Permit', actionText: 'Open Business Permit' },
  { id: 'building', title: 'Building permit', phrases: ['building permit', 'construction permit', 'building clearance'],
    text: 'Choose Building Permit in E-Services. The form asks for property and construction details. Review the published requirements before applying; submitting the form does not mean the permit is approved.', route: '/e-services?type=Building%20Permit', actionText: 'Open Building Permit' },
  { id: 'barangay-clearance', title: 'Barangay clearance', phrases: ['barangay clearance', 'brgy clearance'],
    text: 'Sign in to E-Services and select Barangay Clearance. Complete your applicant and residency details, review the information and submit. Track the saved application in My submissions.', route: '/e-services?type=Barangay%20Clearance', actionText: 'Apply for Barangay Clearance' },
  { id: 'indigency', title: 'Certificate of indigency', phrases: ['indigency', 'indigent', 'financial assistance', 'tabang'],
    text: 'The Certificate of Indigency form is available in E-Services. Complete the required household and assistance details. For other assistance programs, consult the department directory; eligibility and availability must be confirmed by the office.', route: '/e-services?type=Certificate%20of%20Indigency', actionText: 'Open Indigency application' },
  { id: 'zoning', title: 'Zoning clearance', phrases: ['zoning', 'locational clearance'],
    text: 'Choose Zoning Clearance in E-Services, enter your property details and review before submitting. Refer to the service listing for the current requirements.', route: '/e-services?type=Zoning%20Clearance', actionText: 'Open Zoning Clearance' },
  { id: 'cedula', title: 'Cedula and taxes', phrases: ['cedula', 'community tax', 'real property tax', 'amillar', 'tax payment'],
    text: 'Check the government services listing for tax and cedula information and the responsible office. I cannot calculate your taxes or confirm an assessment.', route: '/services', actionText: 'Browse government services' },
  { id: 'tracking', title: 'Track an application', phrases: ['track', 'status', 'ticket', 'my submissions', 'application progress'],
    text: 'Sign in with the account used to apply, then open My submissions to view your saved applications and their status. I cannot access private applications or approve requests.', route: '/e-services?view=submissions', actionText: 'View My submissions' },
  { id: 'payment', title: 'Payments and receipts', phrases: ['payment', 'pay', 'fee', 'fees', 'receipt', 'refund', 'bayad', 'cost'],
    text: 'Open your saved application to check its assessment and available payment options. If a payment was interrupted, check its status before paying again. I cannot confirm payment, quote a fee or issue a refund.', route: '/e-services?view=submissions', actionText: 'Check application payment' },
  { id: 'account', title: 'Sign in and account recovery', phrases: ['login', 'log in', 'sign in', 'register', 'account', 'password', 'forgot', 'reset password'],
    text: 'Use Sign in to access your account. Choose Create an account to register, or Forgot password to request a reset link. Never share your password or verification codes in this chat.', route: '/login', actionText: 'Open Sign in' },
  { id: 'services', title: 'Government services', phrases: ['service', 'services', 'permit', 'permits', 'apply', 'application', 'requirements'],
    text: 'Browse Government Services for published requirements and the responsible office. For an online application, open E-Services and select the relevant form. Current fees and processing details belong to the service listing.', route: '/services', actionText: 'Browse services' },
  { id: 'civil-registry', title: 'Civil registry documents', phrases: ['birth', 'marriage', 'death certificate', 'civil registry', 'civil registrar'],
    text: 'Use the government services listing to find published civil registry information and the responsible office. Confirm the current process with that office before visiting.', route: '/services', actionText: 'Find civil registry services' },
  { id: 'forms', title: 'Download forms', phrases: ['download', 'downloads', 'form', 'forms', 'document', 'documents', 'certificate'],
    text: 'Visit Downloads for published municipal forms and documents. If a file is not posted or cannot be opened, contact the responsible office through the directory.', route: '/downloads', actionText: 'Browse Downloads' },
  { id: 'tourism', title: 'Tourist destinations', phrases: ['tourism', 'tourist', 'beach', 'reef', 'destination', 'attraction', 'suroy'],
    text: 'Visit Tourist Spots to browse published destinations. The tourism map shows only locations with recorded coordinates. Confirm opening hours and availability using the published contact details.', route: '/tourism/spots', actionText: 'Explore Tourist Spots' },
  { id: 'map', title: 'Maps and directions', phrases: ['map', 'maps', 'directions', 'location', 'vicinity'],
    text: 'Open the Tourism Map for published locations and directions. Locations without verified coordinates remain in the address list. If map tiles fail, the location list remains available.', route: '/tourism/map', actionText: 'Open Tourism Map' },
  { id: 'events', title: 'Festivals and events', phrases: ['festival', 'festivals', 'fiesta', 'event', 'events', 'festivities'],
    text: 'Check Festivities for published event information. Dates and schedules can change; use the current listing or contact the organizer to confirm.', route: '/tourism/festivities', actionText: 'View Festivities' },
  { id: 'food', title: 'Local delicacies', phrases: ['food', 'delicacy', 'delicacies', 'seafood', 'eat'],
    text: 'Explore the Delicacies page for published local food information.', route: '/tourism/delicacies', actionText: 'Explore Delicacies' },
  { id: 'news', title: 'News and announcements', phrases: ['news', 'announcement', 'announcements', 'update', 'updates'],
    text: 'Read News for published municipal updates and announcements. I do not have a live news feed in this chat.', route: '/news', actionText: 'Read News' },
  { id: 'advisories', title: 'Weather and public advisories', phrases: ['weather', 'forecast', 'storm', 'typhoon', 'advisory', 'advisories', 'alert'],
    text: 'Check Public Advisories for published notices. This assistant cannot provide real-time weather or emergency monitoring.', route: '/news/advisories', actionText: 'Read Public Advisories' },
  { id: 'emergency', title: 'Emergency contacts', phrases: ['emergency', 'rescue', 'police', 'fire', 'ambulance', 'danger'],
    text: 'This chat cannot dispatch assistance or monitor emergencies. Contact local emergency services directly. Use the published directory for current contact details; do not wait for a chat reply in an emergency.', route: '/executive/directory', actionText: 'Open official directory' },
  { id: 'directory', title: 'Contact municipal offices', phrases: ['contact', 'phone', 'email', 'office hours', 'directory', 'office', 'offices', 'address'],
    text: 'Use the Municipal Directory for published office contact details. Verify office hours with the responsible office before visiting.', route: '/executive/directory', actionText: 'View Municipal Directory' },
  { id: 'mayors', title: 'Municipal leadership', phrases: ['mayor', 'mayors', 'leadership', 'officials'],
    text: 'Find published mayoral information in About Talibon. For office contact details, use the Municipal Directory.', route: '/about/mayors', actionText: 'View List of Mayors' },
  { id: 'barangays', title: 'Barangay profiles', phrases: ['barangay', 'barangays', 'brgy'],
    text: 'Browse Barangay Profiles for published information about the municipality’s barangays.', route: '/about/barangays', actionText: 'View Barangay Profiles' },
  { id: 'transparency', title: 'Transparency and budgets', phrases: ['budget', 'transparency', 'bidding', 'procurement', 'citizen charter', 'citizens charter'],
    text: 'Visit the transparency pages for published reports and documents. I cannot supply unpublished budget figures or procurement results.', route: '/transparency/charter', actionText: 'Open Citizen’s Charter' },
  { id: 'privacy', title: 'Privacy and personal data', phrases: ['privacy', 'personal data', 'data protection'],
    text: 'Read the Privacy Policy for information about personal data. Chat history stays in memory while this page is open; Clear conversation removes it. Avoid entering sensitive personal details.', route: '/privacy-policy', actionText: 'Read Privacy Policy' },
  { id: 'about', title: 'About Talibon', phrases: ['about talibon', 'history', 'profile', 'population', 'demographics', 'industry', 'hymn', 'seal'],
    text: 'Explore About Talibon for the published municipal profile, history and related pages. Population figures and other statistics should be read with their source dates.', route: '/about/profile', actionText: 'About Talibon' },
];
const normalize = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
export async function answerMunicipalQuestion(question: string): Promise<AssistantAnswer> {
  const query = ' ' + normalize(question) + ' ';
  // Word boundaries avoid matching "fire" in "fireworks", or "fee" in "coffee".
  let best: AssistantTopic | undefined;
  let score = 0;
  for (const topic of assistantTopics) {
    const match = Math.max(0, ...topic.phrases.filter(phrase => query.includes(' ' + normalize(phrase) + ' ')).map(phrase => normalize(phrase).length));
    if (match > score) { score = match; best = topic; }
  }
  if (best) return { text: best.text, route: best.route, actionText: best.actionText };
  return {
    text: 'I do not have a prepared answer for that question. Choose a topic below, search the website, or contact the responsible municipal office through the directory. I cannot look up private records or provide live updates.',
    route: '/search', actionText: 'Search the website',
  };
}
