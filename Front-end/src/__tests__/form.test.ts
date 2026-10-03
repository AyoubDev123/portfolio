import { ENTITIES } from "../admin/entities";
import { FormError, toFormState, toPayload } from "../admin/form";

const projects = ENTITIES.find((e) => e.id === "projects")!;

describe("formulaire admin", () => {
  it("fait l'aller-retour liste ↔ textarea", () => {
    const state = toFormState(projects.fields, { stack: ["Python", "SQL"], featured: true, experience_id: null });
    expect(state.stack).toBe("Python\nSQL");
    expect(state.featured).toBe(true);
    expect(state.experience_id).toBe("");
    const payload = toPayload(projects.fields, { ...state, stack: " Python \n\n SQL \n" });
    expect(payload.stack).toEqual(["Python", "SQL"]);
    expect(payload.experience_id).toBeNull();
  });

  it("convertit les identifiants et les nombres", () => {
    const state = toFormState(projects.fields, {});
    const payload = toPayload(projects.fields, { ...state, experience_id: "3", position: "2" });
    expect(payload.experience_id).toBe(3);
    expect(payload.position).toBe(2);
  });

  it("rejette un JSON invalide avec un message lisible", () => {
    const state = toFormState(projects.fields, {});
    expect(() => toPayload(projects.fields, { ...state, images: "[{" })).toThrow(FormError);
  });

  it("envoie null pour une date vide (expérience en cours)", () => {
    const exp = ENTITIES.find((e) => e.id === "experiences")!;
    const payload = toPayload(exp.fields, { ...toFormState(exp.fields, {}), end_date: "" });
    expect(payload.end_date).toBeNull();
  });
});
