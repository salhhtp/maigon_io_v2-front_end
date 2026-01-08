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
      expect(playbook.checklist.length).toBeGreaterThan(0);
      playbook.criticalClauses.forEach((clause) => {
        expect(clause.mustInclude.length).toBeGreaterThan(0);
        expect(clause.redFlags.length).toBeGreaterThan(0);
      });
      playbook.checklist.forEach((item) => {
        expect(item.id).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(item.requiredSignals.length).toBeGreaterThan(0);
        expect(item.insertionPolicyKey).toBeTruthy();
        const mapping = item.evidenceMapping;
        expect(mapping).toBeTruthy();
        const hasMapping =
          (mapping.clauseIds?.length ?? 0) > 0 ||
          (mapping.headings?.length ?? 0) > 0 ||
          (mapping.topics?.length ?? 0) > 0;
        expect(hasMapping).toBe(true);
      });
    });
  });
});
