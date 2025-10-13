# Deployment Workaround

## Problem

The template-based approach has a chicken-and-egg problem:
- Templates need to be deployed with constructors
- Constructors try to call the factory contract
- But factory doesn't exist yet!

## Immediate Solution

For now, let's deploy the **original factory** with embedded bytecode, but **without the automated-splitter** to keep it small enough:

### Option 1: Deploy Basic Factory Only (Recommended for Testing)

1. Temporarily comment out the `createAutomatedVault` function in factory.ts
2. This removes the large automated-splitter bytecode
3. Deploy the factory successfully
4. Test basic vault creation

### Option 2: Use the Old Working Factory

If you have a previously deployed factory that works, use that address in your frontend for now.

## Long-Term Solution

The proper fix requires refactoring the contracts to separate deployment from initialization:

1. **Add a separate `initialize()` function** to splitter/automated-splitter
2. **Keep constructor minimal** (no external calls)
3. **Factory calls `initialize()` after cloning**

This is a significant refactoring that should be done carefully.

## Quick Fix for Now

Let's deploy just the basic splitter functionality:

```bash
# Use the old deploy script
npm run deploy
```

This will deploy the factory with just basic splitter support (no automation yet).

Once deployed, you can:
- Test basic vault creation
- Test deposits and withdrawals  
- Verify the frontend works

Then we can work on properly implementing the automation deployment.

## Why This Happened

The template approach is correct in theory, but the current contract architecture wasn't designed for it. The contracts assume they're being deployed directly with all dependencies available, not as templates to be cloned later.

## Next Steps

1. Deploy basic factory for testing: `npm run deploy`
2. Test frontend with basic functionality
3. Plan contract refactoring for proper template support
4. Implement automation in a future update

Sorry for the confusion! Let's get you unblocked with the basic deployment first.
