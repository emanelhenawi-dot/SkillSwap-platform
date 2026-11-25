import User from '../models/User.js';
import Notification from '../models/Notification.js';

export const notify = (user, type, data = {}) => Notification.create({ user, type, data });

export async function linkParentChild(parent, child) {
  await User.updateOne({ _id: parent._id }, { $addToSet: { children: child._id } });
  await User.updateOne({ _id: child._id }, { $addToSet: { parents: parent._id } });
  await notify(parent._id, 'child_linked', { childName: child.name });
}

export async function notifyParents(child, type, data = {}) {
  for (const p of child.parents) await notify(p, type, { childName: child.name, ...data });
}