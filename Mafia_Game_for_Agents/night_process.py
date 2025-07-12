import asyncio
import re
from collections import defaultdict
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

# Model setup
model_client = OpenAIChatCompletionClient(model="gpt-4o")

# General game rules
GAME_RULES = """
You are playing the social deduction game Mafia with 6 total players, identified as Player 1 to Player 6. Player 6 is the referee so don't include them in the gameplay.
Roles include: 1 Killer, 1 Detective, and 3 Peasants. One Referee manages the game and does not participate in the conversation.

The game alternates between Day and Night phases.
During the **Day Phase**, all players:
1. Internally think about the current situation and decide what to say.
2. Output a public 'speech' visible to other players.
After all players have spoken, each one:
- Thinks about who seems suspicious based on the speeches.
- Publicly casts a vote: "I vote Player X".
The player with the most votes is eliminated.

You must stay in character and NEVER reveal your secret role unless it's a strategic move, you can also lie about your role. The killer wins by eliminating everyone. The villagers (Detective + Peasants) win by eliminating the killer through voting.
"""

# Memory storage per agent
agent_memories = defaultdict(str)

# Agents setup (fixed roles for now)
agents = [
    AssistantAgent("Player_1", model_client, system_message=GAME_RULES + "\nYou are the killer Your index is player 1  keep in mind who is alive and what round you are."),
    AssistantAgent("Player_2", model_client, system_message=GAME_RULES + "\nYou are the detective Your index is player 2  keep in mind who is alive and what round you are."),
    AssistantAgent("Player_3", model_client, system_message=GAME_RULES + "\nYou are a peasant Your index is player 3.  keep in mind who is alive and what round you are"),
    AssistantAgent("Player_4", model_client, system_message=GAME_RULES + "\nYou are a peasant Your index is player 4  keep in mind who is alive and what round you are."),
    AssistantAgent("Player_5", model_client, system_message=GAME_RULES + "\nYou are a peasant Your index is player 5, other players are player 1,2,3, and 4, keep in mind who is alive and what round you are."),
    AssistantAgent("Player_6", model_client, system_message="You are the neutral referee."),
]

live_players = agents[:5]  # Players only, excluding referee

async def run_night_phase():
    global live_players
    killer = agents[0]  # Player_1
    detective = agents[1]  # Player_2
    referee = agents[5]

    # Get killer's free-form reasoning
    killer_prompt = (
        f"You are the killer. Provide your reasoning and decision for who to eliminate tonight. "
        f"Only choose among the following alive players: {[a.name for a in live_players if a.name != 'Player_1']}."
        f"\nRespond freely, but make your intent clear."
    )
    kill_response = await killer.run(task=killer_prompt)
    killer_text = kill_response.messages[-1].content.strip()
    print(f"Killer's freeform response:\n{killer_text}\n")

    # Ask referee to interpret the killer's response
    referee_prompt = (
        f"The killer gave the following response:\n\n{killer_text}\n\n"
        f"Based on this, determine **only one player** to be killed from the list of alive players: "
        f"{[a.name for a in live_players if a.name != 'Player_1']}.\n"
        f"Respond strictly in the format: **killed** Player_X"
    )
    referee_response = await referee.run(task=referee_prompt)
    referee_text = referee_response.messages[-1].content.strip()
    print(f"Referee's interpretation:\n{referee_text}")

    killed_match = re.search(r"\*\*killed\*\*\s*(Player_\d+)", referee_text)
    killed_player = killed_match.group(1) if killed_match else None

    # Get detective choice
    alive_detect_targets = [a.name for a in live_players if a.name != "Player_2"]
    detective_prompt = (
        f"As detective, choose one player to investigate tonight from this list: {alive_detect_targets}. "
        f"Respond strictly in format: **investigate: Player_X**"
    )
    investigate_response = await detective.run(task=detective_prompt)
    print(f"Detective's response:\n{investigate_response.messages[-1].content}")
    investigated_match = re.search(r"\*\*investigate:\s*(Player_\d+)\*\*", investigate_response.messages[-1].content)
    investigated_player = investigated_match.group(1) if investigated_match and investigated_match.group(1) in alive_detect_targets else None

    if investigated_player:
        role = "killer" if investigated_player == "Player_1" else "not the killer"
        agent_memories["Player_2"] += f"\nResult of my (player 2) investigation: {investigated_player} is {role}.\n"
        print(f"Detective investigated {investigated_player} and found them to be {role}.")

    # Update game state: kill player
    if killed_player:
        print(f"\n>>> {killed_player} was killed during the night.\n")
        live_players = [agent for agent in live_players if agent.name != killed_player]
        alive_now = ', '.join(a.name for a in live_players)
        print(f"Remaining players: {alive_now}")

        # Add announcement to memory of all alive players
        announcement = f"The referee announces: {killed_player} was found dead this morning."
        for agent in live_players:
            agent_memories[agent.name] += f"\n{announcement}\n"

    return {"killed": killed_player, "investigated": investigated_player}

