import PersonParticipationConflictException from '#exceptions/person_participation_conflict_exception'
import type { PersonParticipationIdentity } from '#types/person_separation'

export default class PersonSeparationService {
  /**
   * Enforces one pairwise independence rule using stable person identity.
   * Account, role, assignment, and delegation evidence cannot satisfy it.
   */
  assertDifferentPeople(first: PersonParticipationIdentity, second: PersonParticipationIdentity) {
    if (first.personId === second.personId) {
      throw new PersonParticipationConflictException()
    }
  }
}
