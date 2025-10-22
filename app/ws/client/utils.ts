export const getSocketRoom = (rid: string) =>
    rid.length === 34 ? `${rid}-${Meteor.userId()}` : rid;