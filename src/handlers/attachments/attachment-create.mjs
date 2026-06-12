// Example A: Attaching to an Item
const dbPayload = {
    pk: `CONTAINER#${currentActiveContainerId}`,
    sk: `ITEM#${currentActiveItemId}`,
    filename: file.name,
    fileUrl: fileUrl
};

// Example B: Attaching to a Note (Future state)
const dbPayload = {
    pk: `CONTAINER#${currentActiveContainerId}`,
    sk: `NOTE#${currentActiveNoteId}`,
    filename: file.name,
    fileUrl: fileUrl
};

// Fire to the single shared endpoint
const dbRes = await fetch(`${API}/attachments`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(dbPayload)
});
