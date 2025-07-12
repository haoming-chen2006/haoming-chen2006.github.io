import asyncio
from collections import Counter
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

# Model setup
model_client = OpenAIChatCompletionClient(model="gpt-4o")

# General game rules
GAME_RULES = """
You are playing the social deduction game Mafia with 6 total players, identified as Player 1 to Player 6.
Roles include: 1 Killer, 1 Detective, and 3 Peasants. One Referee manages the game and does not participate in the conversation.

The game alternates between Day and Night phases.
During the **Day Phase**, all players:
1. Internally think about the current situation and decide what to say.
2. Output a public 'speech' visible to other players.
After all players have spoken, each one:
- Thinks about who seems suspicious based on the speeches.
- Publicly casts a vote: "I vote Player X".
The player with the most votes is eliminated.

You must stay in character and NEVER reveal your secret role unless it's a strategic move. Use reasoning and deduction. The killer wins by eliminating everyone. The villagers (Detective + Peasants) win by eliminating the killer.
"""

# Agents setup (fixed roles for now)
agents = [
    AssistantAgent("Player 1", model_client, system_message=GAME_RULES + "\nYou are the killer."),
    AssistantAgent("Player 2", model_client, system_message=GAME_RULES + "\nYou are the detective."),
    AssistantAgent("Player 3", model_client, system_message=GAME_RULES + "\nYou are a peasant."),
    AssistantAgent("Player 4", model_client, system_message=GAME_RULES + "\nYou are a peasant."),
    AssistantAgent("Player 5", model_client, system_message=GAME_RULES + "\nYou are a peasant."),
    AssistantAgent("Player 6", model_client, system_message="You are the neutral referee.")  # Not participating this round
]

context = [
    
]


# Players participating in the day round (referee not included)
live_players = agents[:5]

async def run_day_phase():
    print("\n🔆 DAY PHASE: DISCUSSION")
    discussion_context = ""

    # Part 1: Speech round
    for agent in live_players:
        speech_prompt = f"You are {agent.name}. The current discussion so far:\n{discussion_context}\n\nThink internally about the situation. Then give your public speech."  # No vote yet
        response = await agent.aask(speech_prompt)
        speech = response.content.strip()
        discussion_context += f"{agent.name}: {speech}\n"
        print(f"{agent.name} (speech): {speech}\n")

    # Part 2: Voting round
    print("\n🗳️ VOTING ROUND")
    votes = []
    for agent in live_players:
        vote_prompt = f"You are {agent.name}. Based on this discussion:\n{discussion_context}\n\nNow think about who seems most suspicious and publicly vote: 'I vote Player X'."
        vote_response = await agent.aask(vote_prompt)
        vote_text = vote_response.content.strip()
        print(f"{agent.name} (vote): {vote_text}")

        for target in [p.name for p in live_players if p.name != agent.name]:
            if target.lower() in vote_text.lower():
                votes.append(target)
                break

    # Count votes and print result
    vote_count = Counter(votes)
    if vote_count:
        most_voted = vote_count.most_common(1)[0]
        print(f"\n🏁 Eliminated: {most_voted[0]} with {most_voted[1]} votes")
    else:
        print("\n⚠️ No clear vote. Nobody is eliminated.")

if __name__ == "__main__":
    asyncio.run(run_day_phase())
