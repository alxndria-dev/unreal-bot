<img width="2110" height="745" alt="unreal bot banner" src="https://github.com/user-attachments/assets/c312c7da-2a3f-4d53-9107-11a96fc61343" />



# Unreal Discord Bot
### Stack
- JS
- Discord
- Railway

# Guide

The Unreal Bot helps us organise warbands, groups, and Discord links without chasing people through chat. Commands use RoR server time where requested, while Discord displays event times in each person’s local timezone.

## /unreal wb
Create a warband callout.
Use it when you are forming an RvR warband and want to clearly show the leader, faction, and start time.

### Options

- Leader: who is leading
- Time: RoR server time, e.g. 2000
- Side: Order or Destruction
- Notify: optional Discord role to ping

Example: ```/unreal wb leader:@Brodda time:2000 side:Destruction```

https://github.com/user-attachments/assets/2c07eaed-f63a-44b9-872c-60921554e37e

## /unreal group

Create a first-come-first-served group for anything: scenarios, roaming, PvE, levelling, events, or whatever else needs a roster.

### Options
- Faction: Order or Destruction
- Title: what the group is for
- Date + time: RoR server date and time
- Spaces: total group size, including the creator
- Your role: optional confirmed role for the creator

Members choose every role they can play, but always occupy only one space. The group creator can reserve players, assign final roles, remove players, close signups, or cancel the group.

Example:
```/unreal group faction:Destruction title:"Evening SCs" date:2026-09-26 time:2000 spaces:6 your_role:Healer```

https://github.com/user-attachments/assets/a945baa0-42c9-4577-92bc-edae6b56d711

## /unreal link

Create a one-use Discord invite link formatted for Return of Reckoning chat viewable only to you.

### Options
- Channel: where the new member should arrive
- Text: optional link text
- Colour: optional RGB colour, e.g. 129,74,200

The bot gives you a ready-to-copy RoR chat link. 


https://github.com/user-attachments/assets/a11045de-9896-4b8b-a0a7-9aa1bbe452f2


