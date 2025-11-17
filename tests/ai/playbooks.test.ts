import { describe, it, expect } from "vitest";
import { CONTRACT_PLAYBOOKS } from "../../shared/ai/playbooks";

describe("Contract playbooks", () => {
  it("cover seven predefined contract types", () => {
    const keys = Object.keys(CONTRACT_PLAYBOOKS);
    expect(keys).toHaveLength(7);
  });

  it("each playbook declares anchors, regulatory focus, and critical clauses", () => {
    Object.values(CONTRACT_PLAYBOOKS).forEach((playbook) => {
      expect(playbook.displayName).toBeTruthy();
      expect(playbook.clauseAnchors.length).toBeGreaterThan(0);
      expect(playbook.regulatoryFocus.length).toBeGreaterThan(0);
      expect(playbook.criticalClauses.length).toBeGreaterThan(0);
      playbook.criticalClauses.forEach((clause) => {
        expect(clause.mustInclude.length).toBeGreaterThan(0);
        expect(clause.redFlags.length).toBeGreaterThan(0);
      });
    });
  });
});
