import{n as e}from"./chunk-BneVvdWh.js";import{a as t,c as n,i as r,n as i,o as a,r as o,s,t as c}from"./sidebar-story-meta-Dzquq7O5.js";async function l(){await v(()=>g(a().some(e=>e.type===`ready`)).toBe(!0))}async function u(e){await v(()=>g(a().some(t=>h(t,e))).toBe(!0))}async function d(e,t,n){let r=f(t),i=f(n);await e.pointer([{coords:r,keys:`[MouseLeft>]`,target:t},{coords:i,target:n},{coords:i,keys:`[/MouseLeft]`,target:n}])}function f(e){let t=e.getBoundingClientRect();return{x:t.left+t.width/2,y:t.top+t.height/2}}async function p(e){let t=e.getBoundingClientRect();await _.contextMenu(e,{bubbles:!0,clientX:t.left+t.width/2,clientY:t.top+12})}function m(e){if(!(e instanceof HTMLElement))throw Error(`Expected HTMLElement selector to resolve.`);return e}function h(e,t){return Object.entries(t).every(([t,n])=>{let r=e[t];return Array.isArray(n)?JSON.stringify(r)===JSON.stringify(n):r===n})}var g,_,v,y,b,x,S,C,w,T;e((()=>{s(),r(),{expect:g,fireEvent:_,waitFor:v,within:y}=__STORYBOOK_MODULE_TEST__,b={title:`Sidebar/Interactions`,args:c,argTypes:i,decorators:o,render:t},x={args:{highlightedVisibleCount:4,visibleCount:4},play:async({canvas:e,step:t,userEvent:r})=>{await l(),n(),await t(`request a new session`,async()=>{await r.click(e.getByRole(`button`,{name:`New Session`})),await u({type:`createSession`})}),await t(`change sessions shown`,async()=>{n(),await r.click(e.getByRole(`button`,{name:`Show 6 sessions`})),await u({type:`setVisibleCount`,visibleCount:6})}),await t(`switch layout mode`,async()=>{n(),await r.click(e.getByRole(`button`,{name:`Horizontal`})),await u({type:`setViewMode`,viewMode:`horizontal`})}),await t(`open sidebar settings`,async()=>{n(),await r.click(e.getByRole(`button`,{name:`Open sidebar theme settings`})),await u({type:`openSettings`})})}},S={play:async({canvas:e,canvasElement:t,step:r,userEvent:i})=>{let a=y(t.ownerDocument.body);await l(),n(),await r(`focus a session from its card`,async()=>{await i.click(e.getByRole(`button`,{name:/Harbor Vale/i})),await u({sessionId:`session-3`,type:`focusSession`})}),await r(`rename through the session context menu`,async()=>{n(),await p(e.getByRole(`button`,{name:/Harbor Vale/i})),await i.click(await a.findByRole(`menuitem`,{name:`Rename`})),await u({sessionId:`session-3`,type:`promptRenameSession`})}),await r(`terminate through the session context menu`,async()=>{n(),await p(e.getByRole(`button`,{name:/Harbor Vale/i})),await i.click(await a.findByRole(`menuitem`,{name:`Terminate`})),await u({sessionId:`session-3`,type:`closeSession`})})}},C={play:async({canvas:e,canvasElement:t,step:r,userEvent:i})=>{let a=t.ownerDocument;await l(),n(),await r(`reorder sessions inside a group`,async()=>{await d(i,m(a.querySelector(`[data-sidebar-session-id="session-1"]`)),m(a.querySelector(`[data-sidebar-session-id="session-2"]`))),await u({groupId:`group-1`,sessionIds:[`session-2`,`session-1`,`session-3`],type:`syncSessionOrder`}),await g(e.getAllByRole(`button`,{name:/show title in 2nd row|layout drift fix|Harbor Vale/i})[0]).toHaveTextContent(`layout drift fix`)})}},w={play:async({canvasElement:e,step:t,userEvent:r})=>{let i=e.ownerDocument;await l(),n(),await t(`move a session into another group`,async()=>{await d(r,m(i.querySelector(`[data-sidebar-session-id="session-3"]`)),m(i.querySelector(`[data-sidebar-group-id="group-2"]`))),await u({groupId:`group-2`,sessionId:`session-3`,type:`moveSessionToGroup`})})}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    highlightedVisibleCount: 4,
    visibleCount: 4
  },
  play: async ({
    canvas,
    step,
    userEvent
  }) => {
    await waitForReadyMessage();
    resetSidebarStoryMessages();
    await step("request a new session", async () => {
      await userEvent.click(canvas.getByRole("button", {
        name: "New Session"
      }));
      await expectMessage({
        type: "createSession"
      });
    });
    await step("change sessions shown", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", {
        name: "Show 6 sessions"
      }));
      await expectMessage({
        type: "setVisibleCount",
        visibleCount: 6
      });
    });
    await step("switch layout mode", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", {
        name: "Horizontal"
      }));
      await expectMessage({
        type: "setViewMode",
        viewMode: "horizontal"
      });
    });
    await step("open sidebar settings", async () => {
      resetSidebarStoryMessages();
      await userEvent.click(canvas.getByRole("button", {
        name: "Open sidebar theme settings"
      }));
      await expectMessage({
        type: "openSettings"
      });
    });
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvas,
    canvasElement,
    step,
    userEvent
  }) => {
    const body = within(canvasElement.ownerDocument.body);
    await waitForReadyMessage();
    resetSidebarStoryMessages();
    await step("focus a session from its card", async () => {
      await userEvent.click(canvas.getByRole("button", {
        name: /Harbor Vale/i
      }));
      await expectMessage({
        sessionId: "session-3",
        type: "focusSession"
      });
    });
    await step("rename through the session context menu", async () => {
      resetSidebarStoryMessages();
      const sessionCard = canvas.getByRole("button", {
        name: /Harbor Vale/i
      });
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Rename"
      }));
      await expectMessage({
        sessionId: "session-3",
        type: "promptRenameSession"
      });
    });
    await step("terminate through the session context menu", async () => {
      resetSidebarStoryMessages();
      const sessionCard = canvas.getByRole("button", {
        name: /Harbor Vale/i
      });
      await openContextMenu(sessionCard);
      await userEvent.click(await body.findByRole("menuitem", {
        name: "Terminate"
      }));
      await expectMessage({
        sessionId: "session-3",
        type: "closeSession"
      });
    });
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvas,
    canvasElement,
    step,
    userEvent
  }) => {
    const storyDocument = canvasElement.ownerDocument;
    await waitForReadyMessage();
    resetSidebarStoryMessages();
    await step("reorder sessions inside a group", async () => {
      const firstSession = getRequiredElement(storyDocument.querySelector('[data-sidebar-session-id="session-1"]'));
      const secondSession = getRequiredElement(storyDocument.querySelector('[data-sidebar-session-id="session-2"]'));
      await dragAndDrop(userEvent, firstSession, secondSession);
      await expectMessage({
        groupId: "group-1",
        sessionIds: ["session-2", "session-1", "session-3"],
        type: "syncSessionOrder"
      });
      const reorderedSessionCards = canvas.getAllByRole("button", {
        name: /show title in 2nd row|layout drift fix|Harbor Vale/i
      });
      await expect(reorderedSessionCards[0]).toHaveTextContent("layout drift fix");
    });
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    step,
    userEvent
  }) => {
    const storyDocument = canvasElement.ownerDocument;
    await waitForReadyMessage();
    resetSidebarStoryMessages();
    await step("move a session into another group", async () => {
      const sourceSession = getRequiredElement(storyDocument.querySelector('[data-sidebar-session-id="session-3"]'));
      const targetGroup = getRequiredElement(storyDocument.querySelector('[data-sidebar-group-id="group-2"]'));
      await dragAndDrop(userEvent, sourceSession, targetGroup);
      await expectMessage({
        groupId: "group-2",
        sessionId: "session-3",
        type: "moveSessionToGroup"
      });
    });
  }
}`,...w.parameters?.docs?.source}}},T=[`ToolbarActions`,`SessionCardActions`,`DragToReorderWithinGroup`,`DragToMoveAcrossGroups`]}))();export{w as DragToMoveAcrossGroups,C as DragToReorderWithinGroup,S as SessionCardActions,x as ToolbarActions,T as __namedExportsOrder,b as default};