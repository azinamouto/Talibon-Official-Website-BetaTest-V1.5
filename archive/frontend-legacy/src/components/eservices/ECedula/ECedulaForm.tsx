/**
 * E-Cedula has no canonical NestJS DTO or verified municipal tax assessment.
 * This screen is deliberately informational until Treasury signs off on the flow.
 */
export default function ECedulaForm() {
  return (
    <section aria-label="E-Cedula service status" className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
      <h2 className="text-xl font-bold">E-Cedula online filing is temporarily unavailable</h2>
      <p className="mt-3 text-sm leading-relaxed">
        Electronic assessment, submission, payment, and printable slips are undergoing municipal validation.
        No application is collected or submitted from this screen. Please contact the Municipal Treasury Office
        for confirmed requirements, fees, and walk-in instructions.
      </p>
    </section>
  );
}
