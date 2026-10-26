// Lets the router wait for the page transition: App.vue calls onPageAfterEnter() from <Transition @after-enter>,
// and scrollBehavior awaits pageEntered() so a saved scroll position is applied to the page that is actually shown,
// not to the one still fading out.

let waiters = []

export const pageEntered = () => new Promise((resolve) => waiters.push(resolve))

export function onPageAfterEnter() {
  const done = waiters
  waiters = []
  for (const resolve of done) resolve()
}
